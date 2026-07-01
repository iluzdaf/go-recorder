import ChangelogReleaseList from "../../components/ChangelogReleaseList";
import SecondaryPageShell from "../../components/SecondaryPageShell";
import { t } from "../../lib/i18n";

export default function ChangelogPage() {
    return (
        <SecondaryPageShell title={t("changelog")}>
            <ChangelogReleaseList />
        </SecondaryPageShell>
    );
}
