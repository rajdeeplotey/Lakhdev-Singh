# DEV FIXTURE ONLY — synthesises test narration with Windows SAPI and records the REAL word
# timings reported by the speech engine. Used solely to verify the reader's audio-text sync.
# It is NOT the author's narration and is stripped from production builds.
#
#   powershell -ExecutionPolicy Bypass -File scripts/dev/make-sample-audio.ps1 -Chapter <path-to-chapter.json> -OutWav <wav> -OutJson <json>
param(
  [Parameter(Mandatory)] [string]$Chapter,
  [Parameter(Mandatory)] [string]$OutWav,
  [Parameter(Mandatory)] [string]$OutJson
)
Add-Type -AssemblyName System.Speech
$ch = Get-Content $Chapter -Raw -Encoding UTF8 | ConvertFrom-Json
$sentences = @()
foreach ($p in $ch.paragraphs) { foreach ($s in $p.sentences) { $sentences += $s.text } }
$text = ($sentences -join ' ')

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = -1
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$synth.SetOutputToWaveFile($OutWav, $fmt)
$null = Register-ObjectEvent -InputObject $synth -EventName SpeakProgress -SourceIdentifier sp
$synth.Speak($text)
$synth.SetOutputToNull()
Start-Sleep -Milliseconds 200
$events = @(Get-Event -SourceIdentifier sp | Sort-Object { $_.SourceEventArgs.CharacterPosition })
Unregister-Event -SourceIdentifier sp

$wavBytes = (Get-Item $OutWav).Length
$duration = ($wavBytes - 44) / 32000.0

$words = @()
for ($i = 0; $i -lt $events.Count; $i++) {
  $e = $events[$i].SourceEventArgs
  $start = $e.AudioPosition.TotalSeconds
  $end = if ($i + 1 -lt $events.Count) { $events[$i + 1].SourceEventArgs.AudioPosition.TotalSeconds } else { $duration }
  $words += [pscustomobject]@{ word = $e.Text; start = [math]::Round($start, 3); end = [math]::Round($end, 3) }
}
$out = [pscustomobject]@{ source = 'Windows SAPI SpeakProgress events (dev test fixture)'; words = $words }
$out | ConvertTo-Json -Depth 4 | Out-File -FilePath $OutJson -Encoding utf8
Write-Output "words: $($words.Count)  duration: $([math]::Round($duration,1))s"
