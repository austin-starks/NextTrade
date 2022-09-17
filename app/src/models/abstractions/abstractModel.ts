import { Types } from "mongoose";

export type Id = Types.ObjectId | string;

export abstract class AbstractModel {
  /**
   * The abstract model class
   *
   * @remarks
   * The abstract model class is has the common DB operations for the models
   * (mainly just save) but also a few helper functions.
   *
   * @privateRemarks
   * Can be extended later to add more common operations (like find and create)
   */
  abstract _id: Id;

  public get id(): Id {
    return this._id;
  }

  abstract save(): Promise<void>;

  // abstract findById(id: Types.ObjectId): Promise<this[]>;

  // abstract findOneById(id: Types.ObjectId): Promise<this>;
}

export default AbstractModel;
