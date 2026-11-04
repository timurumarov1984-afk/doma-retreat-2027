#!/bin/bash
# Нарезка видео для первого экрана сайта.
#
#   tools/make-hero.sh <видео> [старт, сек] [длительность, сек]
#   пример: tools/make-hero.sh ~/Downloads/retreat.mov 12 9
#
# Создаёт в assets/video/:
#   hero.mp4          — горизонтальная версия (компьютер), 1280px
#   hero-mobile.mp4   — вертикальная 9:16 (телефон), 540x960
#   hero-poster.webp  — первый кадр (показывается, пока видео грузится)
# Звук убирается, цвет слегка «утепляется» под палитру сайта.
set -euo pipefail

IN="${1:?Укажите путь к видео}"
START="${2:-0}"
DUR="${3:-10}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/video"
GRADE="eq=saturation=0.88:contrast=1.04:gamma=0.98,colorbalance=rs=0.03:bs=-0.04:rm=0.04:bm=-0.04"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

IFS=x read -r W H < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$IN")
if [ "$W" -ge "$H" ]; then
  WIDE="scale=1280:-2"                       # горизонтальное видео
  TALL="crop=ih*9/16:ih,scale=540:960"       # центр кадра для телефона
else
  WIDE="crop=iw:iw*9/16,scale=1280:-2"       # вертикальное видео: центр для компьютера
  TALL="crop=min(iw\,ih*9/16):min(ih\,iw*16/9),scale=540:960"
fi

ffmpeg -v error -y -ss "$START" -t "$DUR" -i "$IN" -an \
  -vf "fps=25,$GRADE,format=yuv420p" -c:v libx264 -crf 14 -preset fast "$TMP/master.mp4"

ffmpeg -v error -y -i "$TMP/master.mp4" -vf "$WIDE" -an \
  -c:v libx264 -crf 27 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart "$OUT/hero.mp4"

ffmpeg -v error -y -i "$TMP/master.mp4" -vf "$TALL" -an \
  -c:v libx264 -crf 26 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart "$OUT/hero-mobile.mp4"

ffmpeg -v error -y -i "$TMP/master.mp4" -vf "$WIDE" -frames:v 1 -update 1 "$TMP/poster.png"
cwebp -quiet -q 72 "$TMP/poster.png" -o "$OUT/hero-poster.webp"

ls -lh "$OUT"/hero*
