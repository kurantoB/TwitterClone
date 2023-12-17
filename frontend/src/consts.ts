export default {
    // scaling

    // user formats
    MAX_USERNAME_LENGTH: 16,
    MAX_AVATAR_FILESIZE_BYTES: 1048576,
    MAX_BIO_LENGTH: 1680,
    MAX_SHORT_BIO_LENGTH: 140,

    // post formats
    MAX_POST_PREVIEW_LENGTH: 420,
    MAX_POST_PREVIEW_LINES: 6,
    MAX_POST_LENGTH: 1680,
    MAX_POST_MEDIA_BYTES: 1048576,

    // misc formats
    MAX_HASHTAG_LENGTH: 25,

    // functional
    HANDLE_BATCH_SIZE: 5,
    SESSION_TOKEN_EXPIRE_DAYS: 2,

    // values
    CLOUD_STORAGE_AVATAR_BUCKETNAME: "twitterclone-avatars",
    CLOUD_STORAGE_ROOT: "https://storage.googleapis.com"
}