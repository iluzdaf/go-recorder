import SecondaryPageShell from "../../components/SecondaryPageShell";
import SettingsPageContent from "../../components/SettingsPageContent";
import { t } from "../../lib/i18n";

export const metadata = {
    title: t("settings"),
};

export default function SettingsPage() {
    return (
        <SecondaryPageShell title={t("settings")}>
            <SettingsPageContent />
        </SecondaryPageShell>
    );
}
