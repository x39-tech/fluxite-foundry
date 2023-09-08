import { Classes, H3, H4, TextArea } from "@blueprintjs/core";
import {
  APP_COPYRIGHT,
  APP_LICENSE,
  APP_NAME,
  REPO_ISSUES_LINK,
  TSP_WORKING_GROUPS_LINK,
} from "appInfo";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog/DarkModeAwareDialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutDialog = ({ isOpen, onClose }: Props) => {
  return (
    <DarkModeAwareDialog isOpen={isOpen} onClose={onClose}>
      <div className={Classes.DIALOG_HEADER}>
        <H3>About</H3>
      </div>
      <div className={Classes.DIALOG_BODY}>
        <H4>{APP_NAME}</H4>
        <p>
          This is an early prototype application, and likely has bugs. Please
          file issues on the <a href={REPO_ISSUES_LINK}>GitLab repository</a>.
          Please consider{" "}
          <a href={TSP_WORKING_GROUPS_LINK}>
            joining the Control Protocols Working Group
          </a>{" "}
          to participate in the development of UDR.
        </p>
        <p>{APP_COPYRIGHT}</p>
        <p>License:</p>
        <TextArea fill>{APP_LICENSE}</TextArea>
      </div>
    </DarkModeAwareDialog>
  );
};
