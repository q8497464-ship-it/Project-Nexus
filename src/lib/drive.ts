/**
 * Google Drive REST API integration helpers
 */

// Local storage key for persistent drive folder identification
const DRIVE_FOLDER_ID_KEY = "couples_drive_folder_id";
const DRIVE_ACCESS_TOKEN_KEY = "couples_drive_access_token";
const DRIVE_CONNECTED_STATUS_KEY = "couples_drive_connected";

/**
 * Gets cached drive token or null
 */
export function getStoredDriveToken(): string | null {
  return localStorage.getItem(DRIVE_ACCESS_TOKEN_KEY);
}

/**
 * Sets drive token with persistence
 */
export function setStoredDriveToken(token: string | null) {
  if (token) {
    localStorage.setItem(DRIVE_ACCESS_TOKEN_KEY, token);
    localStorage.setItem(DRIVE_CONNECTED_STATUS_KEY, "true");
  } else {
    localStorage.removeItem(DRIVE_ACCESS_TOKEN_KEY);
    localStorage.removeItem(DRIVE_CONNECTED_STATUS_KEY);
    localStorage.removeItem(DRIVE_FOLDER_ID_KEY);
  }
}

/**
 * Gets cached Folder ID
 */
export function getStoredDriveFolderId(): string | null {
  return localStorage.getItem(DRIVE_FOLDER_ID_KEY);
}

/**
 * Sets cached Folder ID
 */
export function setStoredDriveFolderId(id: string | null) {
  if (id) {
    localStorage.setItem(DRIVE_FOLDER_ID_KEY, id);
  } else {
    localStorage.removeItem(DRIVE_FOLDER_ID_KEY);
  }
}

/**
 * Finds if a folder with the given name exists. If not, creates it.
 */
export async function findOrCreateFolder(
  accessToken: string,
  folderName: string = "Couples Truth & Dare Game Media",
  parentFolderId?: string
): Promise<string> {
  try {
    if (!parentFolderId) {
      const cached = getStoredDriveFolderId();
      if (cached) return cached;
    }

    let queryStr = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentFolderId) {
      queryStr += ` and '${parentFolderId}' in parents`;
    }

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id,name)`;

    const res = await fetch(searchUrl, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        const id = data.files[0].id;
        if (!parentFolderId) {
          setStoredDriveFolderId(id);
        }
        return id;
      }
    }

    // Creating a brand new folder
    const body: any = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder"
    };
    if (parentFolderId) {
      body.parents = [parentFolderId];
    }

    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!createRes.ok) {
      const errTxt = await createRes.text();
      throw new Error(`Google Folder creation failed: ${errTxt}`);
    }

    const folder = await createRes.json();
    if (!parentFolderId) {
      setStoredDriveFolderId(folder.id);
    }
    return folder.id;

  } catch (error) {
    console.error("findOrCreateFolder Error:", error);
    throw error;
  }
}

/**
 * Uploads a file (Base64 data URL, general URL, or blob) to Google Drive inside the game folder.
 */
export async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  filename: string,
  mimeType: string,
  urlOrBase64: string
): Promise<{ id: string; webViewLink?: string; webContentLink?: string }> {
  try {
    let fileBlob: Blob;

    // 1. Resolve to binary Blob
    if (urlOrBase64.startsWith("data:")) {
      const arr = urlOrBase64.split(",");
      const match = arr[0].match(/:(.*?);/);
      const resolvedMime = match ? match[1] : mimeType;
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      fileBlob = new Blob([u8arr], { type: resolvedMime });
    } else {
      // General external URL (such as Unsplash fallback or simulator sound)
      const fetchRes = await fetch(urlOrBase64);
      if (!fetchRes.ok) {
        throw new Error(`Could not fetch external media blob: ${fetchRes.statusText}`);
      }
      fileBlob = await fetchRes.blob();
    }

    // 2. Build standard RFC 2387 multipart body
    const boundary = "cpl_gdrive_upload_boundary";
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const metadata = {
      name: filename,
      parents: [folderId]
    };

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const mediaPartHeader = `${delimiter}Content-Type: ${fileBlob.type || mimeType}\r\n\r\n`;

    // Combine chunks safely into single transmission body
    const parts = [
      new TextEncoder().encode(metadataPart),
      fileBlob,
      new TextEncoder().encode(close_delim)
    ];

    const bodyBlob = new Blob(parts);

    // 3. Post to multipart upload API
    const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink";
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: bodyBlob
    });

    if (!uploadRes.ok) {
      const errTxt = await uploadRes.text();
      throw new Error(`Google Drive File Upload failed: ${errTxt}`);
    }

    const driveFile = await uploadRes.json();
    return {
      id: driveFile.id,
      webViewLink: driveFile.webViewLink,
      webContentLink: driveFile.webContentLink
    };

  } catch (error) {
    console.error("uploadFileToDrive error details:", error);
    throw error;
  }
}

/**
 * Triggers OAuth Flow to get implicit Google token
 */
export function openImplicitGoogleAuth(clientId: string) {
  const scope = "https://www.googleapis.com/auth/drive.file";
  const redirectUri = window.location.origin + window.location.pathname;
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=gdrive_auth`;

  // Safe popup height configuration
  const width = 520;
  const height = 650;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  window.open(authUrl, "gdrive_auth_popup", `width=${width},height=${height},left=${left},top=${top}`);
}
