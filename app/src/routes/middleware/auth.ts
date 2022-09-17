import jwt from "jsonwebtoken";
import User from "../../models/user";
import { NextFunction, Request, Response } from "../../utils";

class AuthMiddleware {
  /**
   * Middleware to check if the user is authenticated
   *
   * @remarks
   * After checking if a user is authenticated and authorized to access a route, the
   * middleware attaches the user to the request object. That way, functions in the
   * controller can directly access the user object.
   */

  handleError = (err: Error): [number, string] => {
    if (err instanceof TypeError) {
      return [401, "Not authenticated."];
    }
    return [403, "Not authorized"];
  };

  isAuthorized = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.jwt;
      const data = jwt.verify(
        token,
        process.env.JWT_TOKEN_SECRET
      ) as jwt.JwtPayload;
      const user = await User.findById(data.sub);
      if (!user) throw new Error("Not authorized");
      req.user = user;
      next();
    } catch (err) {
      console.error(err);
      const [statusCode, errMsg] = this.handleError(err);
      res.status(statusCode).json({ msg: errMsg });
    }
  };
}

export default new AuthMiddleware();
