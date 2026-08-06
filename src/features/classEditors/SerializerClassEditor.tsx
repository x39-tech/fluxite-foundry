import { useId } from "react";
import { EntityId } from "app/persistentState";
import { RenderError } from "components/RenderError";
import { classKinds } from "./context";
import { ClassIdentityFields } from "./ClassIdentityFields";
import { useSerializerClassInfo } from "./state";

interface Props {
  id: EntityId;
}

export const SerializerClassEditor = ({ id }: Props) => {
  const serializerClass = useSerializerClassInfo(id);
  const idPrefix = useId();

  if (!serializerClass) {
    return <RenderError />;
  }

  return (
    <ClassIdentityFields
      idPrefix={idPrefix}
      kind={classKinds.SERIALIZER}
      id={id}
      codexId={serializerClass.codexId}
      name={serializerClass.name.value}
      description={serializerClass.description?.value}
    />
  );
};
