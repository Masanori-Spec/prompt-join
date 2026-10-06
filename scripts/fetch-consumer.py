#!/usr/bin/env python3
"""Fetch exact official release/source bytes into a private hosted temporary path."""
from pathlib import Path
import hashlib, json, os, urllib.request

ROOT = Path(__file__).resolve().parents[1]
pin = json.loads((ROOT / 'scripts/upstream.json').read_text())
target = Path(os.environ['QPROMPT_TEMP']).resolve()
target.mkdir(parents=True, exist_ok=True)
art = ROOT / 'artifacts/native'
art.mkdir(parents=True, exist_ok=True)

def fetch(url, limit):
    request = urllib.request.Request(url, headers={'User-Agent': 'PromptJoin-native-probe'})
    with urllib.request.urlopen(request, timeout=60) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Official download exceeded pinned limit')
    return data

api = 'https://api.github.com/repos/' + pin['repository']
tag_commit = json.loads(fetch(api + '/commits/' + pin['tag'], 1024 * 1024))
assert tag_commit['sha'] == pin['commit']
release = json.loads(fetch(api + '/releases/tags/' + pin['tag'], 1024 * 1024))
asset = pin['asset']
matches = [a for a in release['assets'] if a['name'] == asset['name']]
assert len(matches) == 1
actual = matches[0]
assert actual['size'] == asset['bytes']
assert actual['digest'] == 'sha256:' + asset['sha256']
assert actual['browser_download_url'] == asset['url']
blob = fetch(asset['url'], asset['bytes'])
assert len(blob) == asset['bytes'] and hashlib.sha256(blob).hexdigest() == asset['sha256']
(target / asset['name']).write_bytes(blob)
tree = json.loads(fetch(api + '/git/trees/' + pin['commit'] + '?recursive=1', 4 * 1024 * 1024))
assert not tree.get('truncated')
tree_files = {f['path']: f for f in tree['tree']}
verified = []
for entry in pin['files']:
    path = entry['path']
    assert tree_files[path]['sha'] == entry['gitBlobSHA'] and tree_files[path]['size'] == entry['bytes']
    data = fetch('https://raw.githubusercontent.com/' + pin['repository'] + '/' + pin['commit'] + '/' + path, entry['bytes'])
    assert len(data) == entry['bytes'] and hashlib.sha256(data).hexdigest() == entry['sha256']
    assert hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == entry['gitBlobSHA']
    dest = target / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    verified.append(entry)
report = {'beforeExecution': True, 'releaseTag': pin['tag'], 'sourceCommit': pin['commit'],
          'officialAsset': asset, 'sourceFiles': verified, 'allUpstreamBytesUnchanged': True}
(art / 'consumer-pin.json').write_text(json.dumps(report, indent=2) + '\n')
print('PASS official release metadata, DEB SHA-256 and eight exact upstream source files')
