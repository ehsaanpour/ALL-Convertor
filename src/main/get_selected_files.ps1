try {
    $shell = New-Object -ComObject 'Shell.Application'
    $windows = $shell.Windows()
    $selected = @()

    foreach ($win in $windows) {
        if ($win.Document) {
            $items = $win.Document.SelectedItems()
            if ($items -and $items.Count -gt 0) {
                foreach ($item in $items) {
                    $selected += $item.Path
                }
            }
        }
    }

    if ($selected.Count -gt 0) {
        $selected | ConvertTo-Json -Compress
    } else {
        "[]"
    }
} catch {
    "[]"
}
