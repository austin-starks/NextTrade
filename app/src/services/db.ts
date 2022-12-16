import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { print } from "../utils";
mongoose.set("useFindAndModify", false);
const cloudDB = process.env.CLOUD_DB;
const localDB = "mongodb://127.0.0.1:27017/nexttrade";
const connectionMap = new Map();
connectionMap.set("cloudDB", cloudDB);
connectionMap.set("cloud", cloudDB);
connectionMap.set("localDB", localDB);
connectionMap.set("local", localDB);

class Db {
  /**
   * The MongoDB database class
   *
   * @remarks
   * This class handles the connection to the MongoDB database. This can be the local
   * connection, cloud connection, or a test connection (in-memory database).
   */

  private dbType: String;
  public mongod = new MongoMemoryServer();

  constructor(dbType: String) {
    this.dbType = dbType;
  }

  private async connectHelper() {
    const connectionURL = connectionMap.get(this.dbType);
    await mongoose
      .connect(connectionURL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
      })
      .then(() => {
        print("Successfully connected to " + this.dbType + " database server!");
      })
      .catch((e) => print(e));
  }

  private async connectTest() {
    await this.mongod.start();
    const uri = await this.mongod.getUri();
    const mongooseOpts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    };
    await mongoose.connect(uri, mongooseOpts);
  }

  public async connect() {
    if (this.dbType === "cloud" || this.dbType === "local") {
      await this.connectHelper();
    } else if (this.dbType === "test") {
      await this.connectTest();
    }
  }

  public async closeDatabase() {
    if (!this.dbType || this.dbType === "cloud" || this.dbType === "local") {
      throw new Error("Not Implemented");
    } else if (this.dbType === "test") {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
      await this.mongod.stop();
    }
  }

  public async clearDatabase() {
    if (!this.dbType || this.dbType === "cloud" || this.dbType === "local") {
      throw new Error("Not Implemented");
    } else if (this.dbType === "test") {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    }
  }
}

export default Db;
