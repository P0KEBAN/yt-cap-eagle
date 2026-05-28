export type VideoMetadata = {
  videoId: string;
  title: string;
  url: string;
  channelName: string;
  uploadDate: string;
  capturedAt: string;
};

export type SaveThumbnailMessage = {
  type: "YT_CAP_SAVE_THUMBNAIL";
  payload: SaveRequest;
};

export type SaveThumbnailResponse =
  | {
      ok: true;
      thumbnailUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

export type Settings = {
  eagleHost: string;
  eaglePort: number;
  defaultFolderId: string;
};

export type SaveRequest = VideoMetadata & {
  thumbnailUrl: string;
  targetFolder: "default" | "inbox";
};
