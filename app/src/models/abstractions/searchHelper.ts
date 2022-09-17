import { Model } from "mongoose";
import { Id } from "./abstractModel";

export default class Searchable {
  private Model: Model<any>;

  constructor(Model: Model<any>) {
    this.Model = Model;
  }

  /**
   * Search for a model by a given query.
   *
   * The typical use case is to search for a model with query in its name.
   * However, it can be extended to search for models with the query
   * in any field.
   *
   * @param query: The query to search for.
   * @param limit: The maximum number of results to return.
   * @param filter: Searches for queries with this filter (for example, searches model with a certain userId)
   * @param returnedFields: List of fields to return. Defaults to name if empty
   * @param queriedFields: List of fields to query. Defaults to name if empty
   * @returns
   */
  public async searchQueryInModel(
    query: string,
    limit: number,
    filter?: {
      userId?: Id;
    },
    returnedFields?: string[],
    queriedFields?: string[]
  ) {
    const returned: any = {};
    if (returnedFields) {
      returnedFields.forEach((field) => {
        returned[field] = 1;
      });
    } else {
      returned["name"] = 1;
    }
    const regex = new RegExp([query].join(""), "i");
    let fields: any = [{ name: { $regex: regex } }];
    if (queriedFields) {
      fields = queriedFields.map((field) => {
        return { [field]: { $regex: regex } };
      });
    }
    const models = await this.Model.find(
      { $or: fields, ...filter },
      returned
    ).limit(limit);

    return models.map((m) => m.toObject());
  }
}
