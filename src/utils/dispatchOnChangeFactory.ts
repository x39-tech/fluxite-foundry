type ChangeRecipe<ObjectType, NewValueType> = (
  draft: ObjectType,
  newValue: NewValueType
) => void;

type DispatchFunction<ObjectType> = <NewValueType>(
  newValue: NewValueType,
  changeRecipe: ChangeRecipe<ObjectType, NewValueType>
) => void;

export class DispatchOnChangeFactory<ObjectType> {
  objectValue: ObjectType;
  dispatchFunction: DispatchFunction<ObjectType>;

  constructor(
    objectValue: ObjectType,
    dispatchFunction: DispatchFunction<ObjectType>
  ) {
    this.objectValue = objectValue;
    this.dispatchFunction = dispatchFunction;
  }

  getFn<NewValueType>(changeRecipe: ChangeRecipe<ObjectType, NewValueType>) {
    return (newValue: NewValueType) => {
      this.dispatchFunction(newValue, changeRecipe);
    };
  }
}
