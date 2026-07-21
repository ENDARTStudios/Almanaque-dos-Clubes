Invoke-Expression "docker ps" | Out-File -FilePath "d:\temp\output.txt"
Get-Content "d:\temp\output.txt"