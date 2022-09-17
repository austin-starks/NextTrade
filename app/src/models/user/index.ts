import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Document, model, Schema } from "mongoose";
import validator from "validator";
import { BrokerageEnum, PrivilegeEnum } from "../../utils/enums";
import AbstractModel, { Id } from "../abstractions/abstractModel";
import { IBrokerage } from "../brokerage/AbstractBrokerage";

export interface IUser {
  _id?: Id;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  brokerage?: IBrokerage;
  phoneNumber?: string;
  privilegeLevel?: PrivilegeEnum;
}

const userSchema = new Schema<IUser>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: {
    type: String,
    required: true,
    index: true,
    unique: true,
    validate: (value: string) => {
      return validator.isEmail(value);
    },
  },
  password: { type: String, required: true },
  phoneNumber: { type: String },
  brokerage: { type: Object },
  privilegeLevel: { type: String, required: true, default: PrivilegeEnum.USER },
  createdAt: { type: Date, default: Date.now },
});

const UserModel = model<IUser>("User", userSchema);

type UserModel = IUser & Document<any, any, IUser>;

export default class User extends AbstractModel implements IUser {
  /**
   * A class representing a user.
   *
   * @remarks
   * A user is someon who has created an account to use the system. They have an email,
   * paassword, and metadata associated with them.
   *
   * @privateRemarks
   * In the future, users will also have a profile associated with them that will be used to
   * recommend articles and stocks that they might like.
   */
  _id: Id;
  brokerage: IBrokerage;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phoneNumber?: string;
  privilegeLevel: PrivilegeEnum;

  async save(): Promise<void> {
    if (this._id) {
      await UserModel.updateOne({ _id: this._id }, this);
      return;
    }
    const model = await UserModel.create(this);
    this._id = model.id;
  }

  constructor(obj?: IUser) {
    super();
    if (obj) {
      this._id = obj._id;
      this.password = obj._id
        ? obj.password
        : bcrypt.hashSync(obj.password, 12);
      this.privilegeLevel = obj.privilegeLevel || PrivilegeEnum.USER;
      this.email = obj.email;
      this.firstName = obj.firstName;
      this.lastName = obj.lastName;
      this.phoneNumber = obj.phoneNumber;
      this.brokerage = obj.brokerage;
    }
  }

  public async generateAuthToken(longExpiration = false) {
    if (!this.id) {
      throw new Error("Authentication failed. User not found.");
    }
    const expiresIn = longExpiration ? "14d" : "24h";
    const token = jwt.sign({ sub: this.id }, process.env.JWT_TOKEN_SECRET, {
      expiresIn: expiresIn,
    });
    return token;
  }

  public static async login(email: string, password: string) {
    const isEmail = validator.isEmail(email);
    if (!isEmail) {
      throw new Error("Invalid login credentials");
    }
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new Error("Invalid login credentials");
    }

    const passwordMatched = await bcrypt.compare(password, user.password);
    if (!passwordMatched) {
      throw new Error("Invalid login credentials");
    }
    return new User(user);
  }

  public static async create(userInfo: IUser) {
    const info = { ...userInfo };
    if (!info.brokerage) {
      const brokerage = {
        name: process.env.BROKERAGE_NAME as BrokerageEnum,
        authDetails: {
          token: process.env.BROKERAGE_TOKEN,
          accountId: null,
        },
      };
      info.brokerage = brokerage;
    }

    const user = new User(info);
    await user.save();
    return user;
  }

  public static async findById(id: string): Promise<User> {
    return UserModel.findOne({ _id: id }).then((userM) => {
      if (!userM) {
        throw Error(`User with_id: ${id} does not exist.`);
      }
      return new User(userM);
    });
  }

  public static async findByEmail(email: string): Promise<User> {
    return UserModel.findOne({ email }).then((userM) => {
      if (!userM) {
        throw Error(`User with email '${email}' does not exist.`);
      }
      return new User(userM);
    });
  }

  public static async find(): Promise<User[]> {
    return UserModel.find().then((userMArr) => {
      return userMArr.map((u) => new User(u));
    });
  }
}
