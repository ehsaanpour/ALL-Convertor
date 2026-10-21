using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace TangerineNativeHook
{
    class Program
    {
        private const int WH_MOUSE_LL = 14;
        private const int WH_KEYBOARD_LL = 13;

        private const int WM_LBUTTONDOWN = 0x0201;
        private const int WM_LBUTTONUP = 0x0202;
        private const int WM_MOUSEMOVE = 0x0200;

        private const int WM_KEYDOWN = 0x0100;
        private const int WM_KEYUP = 0x0101;
        private const int WM_SYSKEYDOWN = 0x0104;
        private const int WM_SYSKEYUP = 0x0105;

        private const int VK_SHIFT = 0x10;
        private const int VK_CONTROL = 0x11;
        private const int VK_MENU = 0x12; // Alt key

        private static LowLevelMouseProc _mouseProc = MouseHookCallback;
        private static LowLevelKeyboardProc _keyboardProc = KeyboardHookCallback;
        private static IntPtr _mouseHookID = IntPtr.Zero;
        private static IntPtr _keyboardHookID = IntPtr.Zero;

        private static bool _isLeftMouseDown = false;
        private static int _startX = 0;
        private static int _startY = 0;
        private static int _currentX = 0;
        private static int _currentY = 0;
        private static bool _isDragging = false;
        private static int _dragThreshold = 8;

        static void Main(string[] args)
        {
            int thresh;
            if (args.Length > 0 && int.TryParse(args[0], out thresh))
            {
                _dragThreshold = thresh;
            }

            _mouseHookID = SetMouseHook(_mouseProc);
            _keyboardHookID = SetKeyboardHook(_keyboardProc);

            Console.WriteLine("{\"event\":\"ready\"}");
            Console.Out.Flush();

            Application.Run();

            UnhookWindowsHookEx(_mouseHookID);
            UnhookWindowsHookEx(_keyboardHookID);
        }

        private static IntPtr SetMouseHook(LowLevelMouseProc proc)
        {
            using (Process curProcess = Process.GetCurrentProcess())
            using (ProcessModule curModule = curProcess.MainModule)
            {
                return SetWindowsHookEx(WH_MOUSE_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
            }
        }

        private static IntPtr SetKeyboardHook(LowLevelKeyboardProc proc)
        {
            using (Process curProcess = Process.GetCurrentProcess())
            using (ProcessModule curModule = curProcess.MainModule)
            {
                return SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
            }
        }

        private delegate IntPtr LowLevelMouseProc(int nCode, IntPtr wParam, IntPtr lParam);
        private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

        private static IntPtr MouseHookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0)
            {
                MSLLHOOKSTRUCT hookStruct = (MSLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(MSLLHOOKSTRUCT));
                int msg = (int)wParam;

                if (msg == WM_LBUTTONDOWN)
                {
                    _isLeftMouseDown = true;
                    _startX = hookStruct.pt.x;
                    _startY = hookStruct.pt.y;
                    _currentX = _startX;
                    _currentY = _startY;
                    _isDragging = false;
                }
                else if (msg == WM_MOUSEMOVE)
                {
                    _currentX = hookStruct.pt.x;
                    _currentY = hookStruct.pt.y;

                    if (_isLeftMouseDown && !_isDragging)
                    {
                        int dx = Math.Abs(_currentX - _startX);
                        int dy = Math.Abs(_currentY - _startY);
                        if (dx > _dragThreshold || dy > _dragThreshold)
                        {
                            _isDragging = true;
                            Console.WriteLine(string.Format("{{\"event\":\"drag_start\",\"x\":{0},\"y\":{1}}}", _currentX, _currentY));
                            Console.Out.Flush();
                        }
                    }
                    else if (_isDragging)
                    {
                        Console.WriteLine(string.Format("{{\"event\":\"drag_move\",\"x\":{0},\"y\":{1}}}", _currentX, _currentY));
                        Console.Out.Flush();
                    }
                }
                else if (msg == WM_LBUTTONUP)
                {
                    if (_isDragging)
                    {
                        Console.WriteLine(string.Format("{{\"event\":\"drag_end\",\"x\":{0},\"y\":{1}}}", hookStruct.pt.x, hookStruct.pt.y));
                        Console.Out.Flush();
                    }
                    _isLeftMouseDown = false;
                    _isDragging = false;
                }
            }
            return CallNextHookEx(_mouseHookID, nCode, wParam, lParam);
        }

        private static IntPtr KeyboardHookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0)
            {
                int msg = (int)wParam;
                int vkCode = Marshal.ReadInt32(lParam);

                if (msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN)
                {
                    string key = null;
                    if (vkCode == VK_SHIFT) key = "Shift";
                    else if (vkCode == VK_MENU) key = "Alt";
                    else if (vkCode == VK_CONTROL) key = "Control";

                    if (key != null)
                    {
                        Console.WriteLine(string.Format("{{\"event\":\"key_down\",\"key\":\"{0}\",\"dragging\":{1},\"x\":{2},\"y\":{3}}}",
                            key, _isDragging ? "true" : "false", _currentX, _currentY));
                        Console.Out.Flush();
                    }
                }
                else if (msg == WM_KEYUP || msg == WM_SYSKEYUP)
                {
                    string key = null;
                    if (vkCode == VK_SHIFT) key = "Shift";
                    else if (vkCode == VK_MENU) key = "Alt";
                    else if (vkCode == VK_CONTROL) key = "Control";

                    if (key != null)
                    {
                        Console.WriteLine(string.Format("{{\"event\":\"key_up\",\"key\":\"{0}\"}}", key));
                        Console.Out.Flush();
                    }
                }
            }
            return CallNextHookEx(_keyboardHookID, nCode, wParam, lParam);
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct POINT
        {
            public int x;
            public int y;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct MSLLHOOKSTRUCT
        {
            public POINT pt;
            public uint mouseData;
            public uint flags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelMouseProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);
    }
}
