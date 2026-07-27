#!/usr/bin/env python3
from __future__ import annotations
import json, struct, urllib.request
from pathlib import Path
_MAX_FACES = 50_000_000

def binary_stl_face_count(path: Path) -> int | None:
    try: data = path.read_bytes()
    except OSError: return None
    if len(data) < 84: return None
    head = data[:256].lstrip().lower()
    if head.startswith((b"<!doctype", b"<html", b"{", b"[")): return None
    if head.startswith(b"solid") and b"facet" in data[:4096].lower(): return None
    n = struct.unpack_from("<I", data, 80)[0]
    if n == 0 or n > _MAX_FACES: return None
    if len(data) != 84 + n * 50: return None
    return int(n)

def is_valid_binary_stl(path: Path) -> bool:
    return binary_stl_face_count(path) is not None

def download_printables_stl(*, file_id: str, model_id: str, dest: Path, min_faces: int = 1) -> None:
    if is_valid_binary_stl(dest):
        n = binary_stl_face_count(dest)
        if n is not None and n >= min_faces: return
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists(): dest.unlink()
    mut = """mutation GetDownloadLink($id: ID!, $modelId: ID!, $fileType: DownloadFileTypeEnum!, $source: DownloadSourceEnum!) {
      getDownloadLink(id: $id, printId: $modelId, fileType: $fileType, source: $source) { ok output { link } }
    }"""
    body = json.dumps({"operationName":"GetDownloadLink","query":mut,"variables":{"id":file_id,"modelId":model_id,"fileType":"stl","source":"model_detail"}}).encode()
    req = urllib.request.Request("https://api.printables.com/graphql/", data=body, headers={"Content-Type":"application/json","User-Agent":"Mozilla/5.0","Referer":"https://www.printables.com/"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r: data = json.loads(r.read())
    link = data["data"]["getDownloadLink"]["output"]["link"]
    req2 = urllib.request.Request(link, headers={"User-Agent":"Mozilla/5.0","Referer":"https://www.printables.com/"})
    print(f"downloading {dest.name}…")
    with urllib.request.urlopen(req2, timeout=300) as r2: dest.write_bytes(r2.read())
    n = binary_stl_face_count(dest)
    if n is None or n < min_faces: raise RuntimeError(f"bad download {dest}")
    print(f"  saved {dest.stat().st_size/1e6:.2f} MB ({n} faces)")
