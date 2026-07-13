/**
 * Home page.
 *
 * This is a Server Component, so it can safely read env-based config
 * and pass only the needed values into the client Chat component.
 */
import Chat from "@/components/Chat";
import { getChatConfig } from "@/lib/config";

export default function Home() {
  const config = getChatConfig();

  return (
    <Chat
      allowProviderSwitch={config.allowProviderSwitch}
      defaultProvider={config.defaultProvider}
      providers={config.providers}
    />
  );
}
