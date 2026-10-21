param(
    [string]$context = "",
    [long]$targetHwnd = 0
)

Add-Type -TypeDefinition '
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinSelectionUtils {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
}';

function Get-WinClass([IntPtr]$hwnd) {
    if ($hwnd -eq [IntPtr]::Zero) { return "" }
    $sb = New-Object System.Text.StringBuilder 256
    [WinSelectionUtils]::GetClassName($hwnd, $sb, $sb.Capacity) | Out-Null
    return $sb.ToString()
}

$shell = New-Object -ComObject 'Shell.Application'

function Get-DesktopFiles {
    try {
        # SWC_DESKTOP = 8, SWFO_NEEDDISPATCH = 1
        $desktop = $shell.Windows().FindWindowSW([ref]0, [ref]0, 8, [ref]0, 1)
        if ($desktop -and $desktop.Document) {
            $items = $desktop.Document.SelectedItems()
            if ($items -and $items.Count -gt 0) {
                $paths = @()
                foreach ($item in $items) {
                    if ($item.Path) { $paths += $item.Path }
                }
                return $paths
            }
        }
    } catch {}
    return @()
}

function Get-ExplorerWindowFiles([long]$matchHwnd = 0) {
    try {
        foreach ($win in $shell.Windows()) {
            if ($win.Document) {
                if ($matchHwnd -eq 0 -or [long]$win.HWND -eq $matchHwnd) {
                    $items = $win.Document.SelectedItems()
                    if ($items -and $items.Count -gt 0) {
                        $paths = @()
                        foreach ($item in $items) {
                            if ($item.Path) { $paths += $item.Path }
                        }
                        if ($paths.Count -gt 0) { return $paths }
                    }
                }
            }
        }
    } catch {}
    return @()
}

$selected = @()

# 1. If explicit context passed from native hook
if ($context -eq "desktop") {
    $selected = Get-DesktopFiles
} elseif ($context -eq "explorer" -and $targetHwnd -gt 0) {
    $selected = Get-ExplorerWindowFiles $targetHwnd
}

# 2. If nothing found yet, check active Foreground Window
if ($selected.Count -eq 0) {
    $fg = [WinSelectionUtils]::GetForegroundWindow()
    $fgClass = Get-WinClass $fg
    if ($fgClass -eq "Progman" -or $fgClass -eq "WorkerW") {
        $selected = Get-DesktopFiles
    } elseif ($fgClass -eq "CabinetWClass") {
        $selected = Get-ExplorerWindowFiles $fg.ToInt64()
    }
}

# 3. If still nothing found, check Desktop (most common for drag-to-convert gestures)
if ($selected.Count -eq 0) {
    $selected = Get-DesktopFiles
}

# 4. If still nothing found, check any open Explorer window
if ($selected.Count -eq 0) {
    $selected = Get-ExplorerWindowFiles 0
}

if ($selected.Count -gt 0) {
    $selected | ConvertTo-Json -Compress
} else {
    "[]"
}
