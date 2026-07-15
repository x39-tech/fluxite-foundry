import {
  APP_COPYRIGHT,
  APP_LICENSE,
  APP_NAME,
  APP_VERSION,
  BUILD_STRING,
  REPO_ISSUES_LINK,
  TSP_WORKING_GROUPS_LINK,
} from "consts";
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
          <p className="mb-4">
            This is an early prototype application, and likely has bugs. Please
            file issues on the{" "}
            <a
              href={REPO_ISSUES_LINK}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitLab repository
            </a>
            . Please consider{" "}
            <a
              href={TSP_WORKING_GROUPS_LINK}
              target="_blank"
              rel="noopener noreferrer"
            >
              joining the Control Protocols Working Group
            </a>{" "}
            to participate in the development of the Fluxite standards suite.
          </p>
          <p className="mb-4">{APP_COPYRIGHT}</p>
          <p className="mb-4 text-sm text-gray-600">
            Version {APP_VERSION} (build {BUILD_STRING})
          </p>
          <p className="mb-2">License:</p>
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
