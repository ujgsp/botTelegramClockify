/**
 * Config — Script Properties
 */
function getConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    TELEGRAM_BOT_TOKEN: props.getProperty("TELEGRAM_BOT_TOKEN") || "",
    CLOCKIFY_API_KEY: props.getProperty("CLOCKIFY_API_KEY") || "",
    CLOCKIFY_WORKSPACE_ID: props.getProperty("CLOCKIFY_WORKSPACE_ID") || "",
    CLOCKIFY_USER_ID: props.getProperty("CLOCKIFY_USER_ID") || "",
    CLOCKIFY_DEFAULT_PROJECT_ID: props.getProperty("CLOCKIFY_DEFAULT_PROJECT_ID") || "",
    SPREADSHEET_ID: props.getProperty("SPREADSHEET_ID") || "",
    TIMEZONE: "Asia/Jakarta"
  };
}
