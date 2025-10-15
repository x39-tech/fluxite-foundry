import {
  APP_COPYRIGHT,
  APP_LICENSE,
  APP_NAME,
  REPO_ISSUES_LINK,
  TSP_WORKING_GROUPS_LINK,
} from "appInfo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { Textarea } from "components/scn-ui/Textarea";
import { Separator } from "components/scn-ui/Separator";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutDialog = ({ isOpen, onClose }: Props) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>About</DialogTitle>
        </DialogHeader>
        <Separator orientation="horizontal" />
        <div>
          <div className="text-lg font-bold mb-2">{APP_NAME}</div>
          <p>
            This is an early prototype application, and likely has bugs. Please
            file issues on the <a href={REPO_ISSUES_LINK}>GitLab repository</a>.
            Please consider{" "}
            <a href={TSP_WORKING_GROUPS_LINK}>
              joining the Control Protocols Working Group
            </a>{" "}
            to participate in the development of the Fluxite standards suite.
          </p>
          <p>{APP_COPYRIGHT}</p>
          <p>License:</p>
          <Textarea
            value={APP_LICENSE}
            readOnly
            className="h-32 overflow-y-auto resize-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
