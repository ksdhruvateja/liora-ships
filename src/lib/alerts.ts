import { getConfig } from "./config";
import { OPERATOR_EMAIL, sendPlainEmail } from "./email";

export async function sendOpsAlert(subject: string, body: string) {
  const config = getConfig();
  const lines = [`[${config.appName} alert] ${subject}`, body];
  console.error(lines.join("\n"));

  const tasks: Promise<unknown>[] = [];

  if (config.SLACK_WEBHOOK_URL) {
    tasks.push(
      fetch(config.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `*${config.appName}*\n*${subject}*\n${body}`,
        }),
      }).catch((error) => {
        console.error("Slack alert failed", error);
      }),
    );
  }

  if (config.GMAIL_APP_PASSWORD) {
    tasks.push(
      sendPlainEmail({
        to: config.ALERT_EMAIL || config.LABEL_NOTIFY_EMAIL || OPERATOR_EMAIL,
        subject: `${config.appName}: ${subject}`,
        text: body,
      }).catch((error) => {
        console.error("Email alert failed", error);
      }),
    );
  }

  await Promise.all(tasks);
}
