const META = {"title": "Starship with Custom Name", "summary": "Remix of Josh1297\u2019s SpaceX Starship with a browser customizer for a name on the hull.", "descriptionHtml": "<h3>Summary</h3>\n<p>Remix of <a href=\"https://www.printables.com/model/225040-spacex-starship\">Josh1297\u2019s SpaceX Starship</a> with a browser customizer for a name on the hull.</p>\n<p><strong>v1.1.5</strong> base mesh includes <strong>6 Raptors</strong> \u2014 3 sea-level + 3 vacuum \u2014 with clear tip-plane spacing.</p>\n<p><strong>Remix / tool:</strong> <a href=\"https://github.com/leedsexplore\">David Leeds</a> (@leedsexplore) \u2014 <a href=\"https://github.com/leedsexplore/starship-custom-name\">Starship Custom Name</a> <strong>Parent:</strong> Josh1297 \u2014 <a href=\"https://creativecommons.org/licenses/by-nc/4.0/\">CC BY-NC</a></p>\n<h3>Customize in the browser</h3>\n<p><strong>https://leedsexplore.github.io/starship-custom-name/</strong></p>\n<p>No OpenSCAD install needed. In the browser you can:</p>\n<p>\u2022 Set name, fonts (Roboto, Montserrat, Oswald, Bebas Neue, Inter, \u2026), raised/engraved, wrap-to-hull, scale</p>\n<p>\u2022 Preview Prusa-oriented colors</p>\n<p>\u2022 Download <strong>STL</strong> (engraved = true boolean cut), <strong>3MF</strong> (MMU: separate Hull + Letters \u2014 best for raised multi-color), or a <strong>PNG cover</strong></p>\n<p>Preview colors guide your slicer filament choice \u2014 assign extruders on 3MF objects for multi-material.</p>\n<p>Source: <a href=\"https://github.com/leedsexplore/starship-custom-name\">github.com/leedsexplore/starship-custom-name</a></p>\n<h3>What\u2019s included here</h3>\n<p>| File | Purpose |</p>\n<p>|------|---------|</p>\n<p>| `starship_custom_name_sample.stl` | Ready-to-print sample with raised text **Custom Name** (6 engines) |</p>\n<p>| `StarShipV2_original.stl` | Base mesh with 6 Raptors (3 SL + 3 Vac) for your own text / the web tool |</p>\n<h3>Print tips</h3>\n<p>Same as the parent: print vertically with supports. Layer height 0.2 mm works well; raised text reads cleaner at 0.15 mm. For two-color raised lettering, prefer the web tool\u2019s <strong>3MF (MMU)</strong> export.</p>\n<h3>Cover photo</h3>\n<p>Bundled cover is a customizer preview render. Replace with a photo of your printed model when you have one.</p>\n<h3>License</h3>\n<p>CC BY-NC \u2014 non-commercial use; credit <strong>Josh1297</strong> (and this remix if you share further remakes).</p>", "remixDescription": "Remix of https://www.printables.com/model/225040-spacex-starship.", "license": "3", "category": "82", "tags": ["spacex", "starship", "remix", "customizable", "nameplate", "space"], "modelId": "1791741", "remixParent": "225040", "files": ["StarShipV2_original.stl", "starship_custom_name_sample.stl", "cover.png"], "clientUid": "6fdbd718-4add-4083-ae24-8ad4d3b2f4e6", "fileUrls": {"StarShipV2_original.stl": "https://leedsexplore.github.io/starship-custom-name/assets/StarShipV2_original.stl", "starship_custom_name_sample.stl": "https://leedsexplore.github.io/starship-custom-name/assets/starship_custom_name_sample.stl", "cover.png": "https://leedsexplore.github.io/starship-custom-name/assets/printables_cover.png"}};

async function gql(operationName, query, variables) {
  const res = await fetch('https://api.printables.com/graphql/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Accept': 'application/graphql-response+json, application/json',
      'Content-Type': 'application/json',
      'Origin': 'https://www.printables.com',
      'Referer': 'https://www.printables.com/',
      'client-uid': META.clientUid,
      'graphql-client-version': 'v4.5.0',
    },
    body: JSON.stringify({ operationName, query, variables }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + JSON.stringify(data).slice(0,300));
  if (data.errors) throw new Error('GQL errors: ' + JSON.stringify(data.errors).slice(0,500));
  return data.data;
}

const UPLOAD_MODEL = `mutation UploadModel($fileName: String!, $folder: String!, $unzip: Boolean!) {
  upload: printFileUpload2(fileName: $fileName, folder: $folder, unzip: $unzip) {
    ok errors { field messages } uploadData { url fields } fileUpload { id }
  }
}`;
const UPLOAD_DONE = `mutation UploadModelFinished($fileUploadId: ID!) {
  uploadFinished: printFileUploadFinished(fileUploadId: $fileUploadId) {
    ok errors { field messages } output { id filePath }
  }
}`;
const POLL = `query PollFileUploads($ids: [ID!]!) {
  fileUploads: modelFileUploads(ids: $ids) {
    id isProcessed notInspectedFiles
    stls { id name folder note fileSize order }
    images { id filePath rotation order }
    otherFiles { id name folder note fileSize order }
  }
}`;
const MODEL_UPDATE = `mutation ModelUpdate(
  $tags: [ID], $id: ID, $description: String, $category: ID, $license: ID,
  $mainImage: ID, $name: String, $draft: Boolean, $summary: String,
  $remixParents: [ID], $nsfw: Boolean, $aiGenerated: Boolean, $politicalContent: Boolean,
  $authorship: PrintAuthorshipEnum, $remixDescription: String, $club: Boolean,
  $price: Int, $excludeCommercialUsage: Boolean,
  $stls: [STLFileInputType], $otherFiles: [OtherFileInputType], $images: [PrintImageInputType],
  $gcodes: [GcodeFileInputType], $slas: [SLAFileInputType]
) {
  modelUpdate(
    tags: $tags, id: $id, summary: $summary, description: $description, draft: $draft,
    category: $category, license: $license, mainImage: $mainImage, name: $name,
    remixParents: $remixParents, nsfw: $nsfw, aiGenerated: $aiGenerated,
    politicalContent: $politicalContent, authorship: $authorship,
    remixDescription: $remixDescription, premium: $club, price: $price,
    excludeCommercialUsage: $excludeCommercialUsage,
    slas: $slas, gcodes: $gcodes, stls: $stls, otherFiles: $otherFiles, images: $images
  ) {
    ok output { id slug name datePublished } errors { field messages }
  }
}`;

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function uploadLocal(fileName) {
  const url = META.fileUrls[fileName];
  if (!url) throw new Error('missing url for ' + fileName);
  const blob = await (await fetch(url)).blob();
  const unzip = false;
  const data = await gql('UploadModel', UPLOAD_MODEL, { fileName, folder: '', unzip });
  const upload = data.upload;
  if (!upload.ok) throw new Error('upload init fail ' + fileName + ' ' + JSON.stringify(upload.errors));
  const fileUploadId = upload.fileUpload.id;
  const uploadData = upload.uploadData;
  const form = new FormData();
  const fields = typeof uploadData.fields === 'string' ? JSON.parse(uploadData.fields) : (uploadData.fields || {});
  for (const [k,v] of Object.entries(fields)) form.append(k, v);
  form.append('file', blob, fileName);
  const s3 = await fetch(uploadData.url, { method: 'POST', body: form });
  if (!s3.ok) {
    const t = await s3.text();
    throw new Error('S3 fail ' + fileName + ' ' + s3.status + ' ' + t.slice(0,200));
  }
  const done = await gql('UploadModelFinished', UPLOAD_DONE, { fileUploadId });
  if (!done.uploadFinished.ok) throw new Error('finish fail ' + fileName + ' ' + JSON.stringify(done.uploadFinished.errors));
  let processed = null;
  for (let i=0;i<90;i++) {
    const poll = await gql('PollFileUploads', POLL, { ids: [fileUploadId] });
    processed = (poll.fileUploads || [])[0];
    if (processed && processed.isProcessed) break;
    await sleep(2000);
  }
  if (!processed || !processed.isProcessed) throw new Error('timeout processing ' + fileName);
  return { fileName, fileUploadId, processed };
}

(async () => {
  const results = [];
  for (const f of META.files) {
    results.push(await uploadLocal(f));
  }
  const stls = [];
  const images = [];
  for (const r of results) {
    const p = r.processed;
    for (const s of (p.stls || [])) stls.push({ id: s.id, name: s.name, folder: s.folder || '', note: s.note || '', order: s.order || 0 });
    for (const im of (p.images || [])) images.push({ id: im.id });
  }
  const imageIds = images.map(i => i.id);
  const variables = {
    id: META.modelId,
    name: META.title,
    summary: META.summary,
    description: META.descriptionHtml,
    draft: false,
    license: META.license,
    category: META.category,
    tags: META.tags,
    authorship: 'remix',
    remixParents: [META.remixParent],
    remixDescription: META.remixDescription,
    nsfw: false,
    aiGenerated: false,
    politicalContent: false,
    club: false,
    price: 0,
    excludeCommercialUsage: false,
    stls,
    images: imageIds.map(id => ({ id })),
    gcodes: [],
    slas: [],
    otherFiles: [],
    mainImage: imageIds[0] || null,
  };
  const upd = await gql('ModelUpdate', MODEL_UPDATE, variables);
  return { uploadResults: results.map(r => ({file:r.fileName, id:r.fileUploadId, stls:(r.processed.stls||[]).length, images:(r.processed.images||[]).length})), modelUpdate: upd.modelUpdate };
})()
