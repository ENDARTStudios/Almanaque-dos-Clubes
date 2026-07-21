Add-Type -AssemblyName System.Diagnostics

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "docker"
$psi.Arguments = "ps --format ""table {{.Names}}"""
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$proc = [System.Diagnostics.Process]::Start($psi)
$proc.WaitForExit()

$stdout = $proc.StandardOutput.ReadToEnd()
$stderr = $proc.StandardError.ReadToEnd()

"STDOUT: $stdout"
"STDERR: $stderr"
"Exit Code: $($proc.ExitCode)"

$stdout | Out-File -FilePath "ps-output.txt"
"