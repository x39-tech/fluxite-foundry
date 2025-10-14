import { Label } from "components/scn-ui/Label";
import { useId } from "react";
import { ResolvedResourceClass } from "udr/udrDatabase";

interface Props {
  resourceClass: ResolvedResourceClass;
}

export const ResourceClassDisplay = ({ resourceClass }: Props) => {
  const descId = useId();
  const idId = useId();
  const resourceTypesId = useId();

  const textClass = "text-sm";

  return (
    <div className="flex flex-col items-stretch gap-2">
      <div>
        <Label htmlFor={descId}>Description</Label>
        <div className={textClass} id={descId}>
          {resourceClass.description}
        </div>
      </div>
      <div>
        <Label htmlFor={idId}>ID</Label>
        <div className={textClass} id={idId}>
          {resourceClass.id}
        </div>
      </div>
      {resourceClass.mediaType && (
        <div>
          <Label htmlFor={resourceTypesId}>Allowed Media Types</Label>
          <div className={textClass} id={resourceTypesId}>
            <ul>
              {resourceClass.mediaType.map((type, idx) => (
                <li key={idx}>{type}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
