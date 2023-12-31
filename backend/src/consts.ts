export default {
    // scaling
    MAX_USERS: 10000,
    MAX_POSTS_PER_USER: 10000,
    NUMBER_OF_RETRIEVABLE_DM_S: 500,
    
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
    MAX_DM_LENGTH: 500,
    MAX_HASHTAG_LENGTH: 25,
    
    // functional
    HANDLE_BATCH_SIZE: 5,
    NOTIFICATION_EXPIRY_DAYS: 30,
    FEED_ACTIVITY_EXPIRY_DAYS: 7,
    REPORT_EXPIRY_DAYS: 30,
    MAX_REPORTS_PER_HOUR: 10,
    ACTION_TAKEN_EXPIRY_DAYS: 30,
    DAYS_OF_ACTIVITY_FOR_PUBLIC_FEED: 30,
    ACCOUNT_TOLERANCE_QUANTITY: 3,
    ACCOUNT_TOLERANCE_DURATION_DAYS: 30,

    // values
    CLOUD_STORAGE_AVATAR_BUCKETNAME: "twitterclone-avatars",
    CLOUD_STORAGE_ROOT: "https://storage.googleapis.com",
    CLOUD_STORAGE_POSTMEDIA_BUCKETNAME: "twitterclone-postmedia"
}