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
