import { Rocket } from '../../app';
import bcrypt from 'bcryptjs';
import { TUser } from '../../types/users.type';

export class UserService {
  private app: Rocket;
  constructor(app: Rocket) {
    this.app = app;
  }

  async create(payload: TUser) {
    const { password, isStatus, ...rest } = payload
    const hashedPassword = await bcrypt.hash(password, Number(this.app.config.BCRYPT_SALT_ROUNDS));
    const userData = {
      password: hashedPassword,
      isStatus: true,
      ...rest
    };

    const result = await this.app.db.client.user.create({
      data: userData,
      select: { id: true, email: true, fullName: true }
    });

    return result;
  }

  async findAll(query: any) {
    const fields = ["id", "email", "img", "role", "fullName", "createdAt", "isStatus"];
    const result = await this.app.db.findAll('user', query, {
      searchableFields: ['email', 'fullName'],
      select: fields.reduce((acc, field) => ({ ...acc, [field]: true }), {}),
    }).exec();

    return result;
  }

  async findOne(id: string) {
    const result = await this.app.db.client.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        img: true,
        isStatus: true,
        role: true,
        createdAt: true
      }
    });
    return result;
  }

  async update(id: string, data: Partial<TUser>) {
    const { password, ...rest } = data;
    const updateData: any = { ...rest };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    return this.app.db.client.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, fullName: true }
    });
  }

  delete(id: string) {
    return this.app.db.client.user.update({
      where: { id },
      data: {
        isStatus: false
      }
    });
  }
}
