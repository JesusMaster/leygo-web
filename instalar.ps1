# Instalador de leygo para Windows: https://leygo.cl
#
#   irm https://leygo.cl/instalar.ps1 | iex
#
# Con opciones (las mismas de .\instalar.ps1: -Redis -Qdrant -Ollama -Todo -Ninguno -Dominio X
# -Puerto N -Version X -SinBuild), más -Carpeta:
#
#   & ([scriptblock]::Create((irm https://leygo.cl/instalar.ps1))) -Redis -Qdrant
#
# Otro leygo en el mismo computador: otra carpeta y otro puerto.
#   & ([scriptblock]::Create((irm https://leygo.cl/instalar.ps1))) -Carpeta leygo-pruebas -Puerto 8080 -Redis -Qdrant
#
# Necesita Docker Desktop con WSL 2. Crea (o actualiza) la carpeta "leygo" donde estás parado
# (-Carpeta . usa la carpeta actual) con la configuración de Docker, sin código fuente: leygo se
# descarga ya compilado desde ghcr.io. Tus datos, tu .env y tu config/ nunca se sobrescriben.
#
# El instalar.ps1 descargado se corre con -ExecutionPolicy Bypass solo para ese proceso: la política
# de ejecución de tu equipo no cambia.
#
# Los textos con tilde van escapados (\u00f3): si el servidor no declara la codificación, irm en
# Windows PowerShell 5.1 lee el script como Latin-1 y los acentos saldrían rotos.
#
# Uso sujeto a la licencia: https://leygo.cl/licencia.txt

# Todo va dentro de un bloque: con "irm | iex" nada queda definido en tu consola, y sin "exit"
# (cerraría la ventana): los errores terminan con "return".
& {
  $ErrorActionPreference = 'Stop'
  $ProgressPreference = 'SilentlyContinue'
  function T([string]$s) { [regex]::Unescape($s) }
  function Fallar([string]$s) { Write-Host $s -ForegroundColor Red }

  # -Carpeta X es de este script; el resto de las opciones pasa tal cual a .\instalar.ps1.
  $dir = if ($env:LEYGO_DIR) { $env:LEYGO_DIR } else { 'leygo' }
  $resto = @()
  $lista = @($args | ForEach-Object { "$_" })
  for ($i = 0; $i -lt $lista.Count; $i++) {
    $a = $lista[$i]
    if ($a -match '^--?carpeta:?$') {
      if ($i + 1 -lt $lista.Count) { $i++; $dir = $lista[$i] }
    } elseif ($a -match '^--?carpeta[=:](.+)$') {
      $dir = $Matches[1]
    } else {
      $resto += $a
    }
  }
  if (-not $dir) { $dir = 'leygo' }
  $fuente = if ($env:LEYGO_FUENTE) { $env:LEYGO_FUENTE.TrimEnd('/') } else { 'https://raw.githubusercontent.com/JesusMaster/leygo/main' }

  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fallar (T 'Falta Docker: instala Docker Desktop con WSL 2 (https://docs.docker.com/desktop/setup/install/windows-install/), \u00e1brelo y vuelve a correr este comando.')
    return
  }

  try {
    # GitHub exige TLS 1.2; Windows PowerShell 5.1 en equipos antiguos no lo activa solo.
    try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch { }

    $base = (Get-Location -PSProvider FileSystem).ProviderPath
    $ruta = [IO.Path]::GetFullPath([IO.Path]::Combine($base, $dir))
    $nuevo = -not (Test-Path -LiteralPath (Join-Path $ruta 'docker-compose.yml'))
    foreach ($d in 'deploy', 'config', 'data') { New-Item -ItemType Directory -Force -Path (Join-Path $ruta $d) | Out-Null }

    # Archivo temporal y luego se reemplaza: si la descarga se corta, el anterior queda intacto.
    function Bajar([string]$f) {
      $destino = Join-Path $ruta $f
      try {
        Invoke-WebRequest -UseBasicParsing -Uri "$fuente/$f" -OutFile "$destino.tmp"
        Move-Item -LiteralPath "$destino.tmp" -Destination $destino -Force
      } catch {
        Remove-Item -LiteralPath "$destino.tmp" -Force -ErrorAction SilentlyContinue
        throw "No se pudo bajar $f de $fuente ($($_.Exception.Message))"
      }
    }
    Write-Host (T 'Descargando la instalaci\u00f3n de leygo\u2026')
    foreach ($f in 'docker-compose.yml', 'instalar.ps1', 'instalar.sh', '.env.example', 'deploy/Caddyfile', 'deploy/actualizador.sh', 'LICENCIA.txt', 'README.md') { Bajar $f }
    if (-not (Test-Path -LiteralPath (Join-Path $ruta 'config/channels.json'))) { Bajar 'config/channels.json' }
  } catch {
    Fallar "x $($_.Exception.Message)"
    return
  }

  if ($nuevo) {
    Write-Host ''
    Write-Host 'leygo es gratis para usarlo en tus equipos y no se puede redistribuir.'
    Write-Host "Licencia completa: $(Join-Path $ruta 'LICENCIA.txt')"
    Write-Host ''
  }

  # El mismo PowerShell con el que se corre esto (Windows PowerShell 5.1 o PowerShell 7).
  $motor = if ($PSVersionTable.PSEdition -eq 'Core') { 'pwsh' } else { 'powershell' }
  $exe = Join-Path $PSHOME $motor
  if ($env:OS -eq 'Windows_NT') { $exe += '.exe' }
  if (-not (Test-Path -LiteralPath $exe)) { $exe = $motor }

  # Los archivos recién bajados: .\instalar.ps1 no necesita volver a descargarlos.
  $antes = $env:LEYGO_SIN_DESCARGA
  $env:LEYGO_SIN_DESCARGA = '1'
  try {
    & $exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ruta 'instalar.ps1') @resto
  } finally {
    if ($null -eq $antes) { Remove-Item Env:LEYGO_SIN_DESCARGA -ErrorAction SilentlyContinue } else { $env:LEYGO_SIN_DESCARGA = $antes }
  }
} @args
