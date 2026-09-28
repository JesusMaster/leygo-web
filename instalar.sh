#!/usr/bin/env bash
# Instalador de leygo: https://leygo.cl
#
#   curl -fsSL https://leygo.cl/instalar.sh | bash -s -- --redis --qdrant
#   curl -fsSL https://leygo.cl/instalar.sh | bash -s -- --dominio agente.tudominio.cl --redis --qdrant
#
# Otro leygo en el mismo computador: otra carpeta y otro puerto.
#   curl -fsSL https://leygo.cl/instalar.sh | bash -s -- --carpeta leygo-pruebas --puerto 8080 --redis --qdrant
#
# Crea (o actualiza) la carpeta "leygo" con la configuración de Docker, sin código fuente:
# leygo se descarga ya compilado desde ghcr.io. Las opciones se le pasan a ./instalar.sh
# (usa --help para verlas). Tus datos, tu .env y tu config/ nunca se sobrescriben.
# Uso sujeto a la licencia: https://leygo.cl/licencia.txt
set -euo pipefail

DIR="${LEYGO_DIR:-leygo}"
# --carpeta X es de este script; el resto de las opciones pasa tal cual a ./instalar.sh.
args=()
while [ $# -gt 0 ]; do
  case "$1" in
    --carpeta) shift; DIR="${1:-leygo}" ;;
    --carpeta=*) DIR="${1#*=}" ;;
    *) args+=("$1") ;;
  esac
  shift
done
FUENTE="${LEYGO_FUENTE:-https://raw.githubusercontent.com/JesusMaster/leygo/main}"

command -v curl >/dev/null || { echo "Falta curl."; exit 1; }
command -v docker >/dev/null || { echo "Falta Docker: instálalo desde https://docs.docker.com/get-docker/ y vuelve a correr este comando."; exit 1; }

nuevo=0; [ -d "$DIR" ] || nuevo=1
mkdir -p "$DIR/deploy" "$DIR/config" "$DIR/data"
cd "$DIR"

bajar() { curl -fsSL "$FUENTE/$1" -o "$2.tmp" && mv "$2.tmp" "$2"; }
echo "Descargando la instalación de leygo…"
bajar docker-compose.yml docker-compose.yml
bajar instalar.sh instalar.sh
bajar .env.example .env.example
bajar deploy/Caddyfile deploy/Caddyfile
bajar LICENCIA.txt LICENCIA.txt
bajar README.md README.md
[ -f config/channels.json ] || bajar config/channels.json config/channels.json
chmod +x instalar.sh

if [ $nuevo = 1 ]; then
  echo
  echo "leygo es gratis para usarlo en tus equipos y no se puede redistribuir."
  echo "Licencia completa: $(pwd)/LICENCIA.txt"
  echo
fi

# Sin terminal (curl | bash) el instalador no necesita preguntar nada: todo va por opciones.
exec ./instalar.sh ${args[@]+"${args[@]}"}
