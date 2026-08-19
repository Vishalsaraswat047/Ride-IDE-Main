Set sh = CreateObject("WScript.Shell")

' If RIDE is already running, just activate that window instead of launching a second instance.
Set ts = sh.Exec("tasklist /FI ""WINDOWTITLE eq RIDE"" /NH")
existing = False
Do While Not ts.StdOut.AtEndOfStream
  If InStr(ts.StdOut.ReadLine(), "electron") > 0 Then existing = True
Loop
If existing Then
  sh.AppActivate "RIDE"
  WScript.Quit
End If

Set fso = CreateObject("Scripting.FileSystemObject")
logDir = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Ride"
If Not fso.FolderExists(logDir) Then fso.CreateFolder(logDir)

sh.CurrentDirectory = "C:\Users\Visha\ride"
sh.Run "cmd /c pnpm dev >> """ & logDir & "\ride-dev.log"" 2>&1", 0, False