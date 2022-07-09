import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { Injectable } from '@nestjs/common';
import { UserEntity } from './user.entity';
import { User } from './user.model';
import { JsonFind } from 'json-find';

@Injectable()
export class UsersService {
  constructor(@InjectRedis() private readonly redis: Redis) {}
  getHello(): string {
    return 'Hello World Users!';
  }

  async listUser(): Promise<UserEntity[]> {
    const cacheUsers = await this.redis.get('users');
    if (cacheUsers) {
      const users = JSON.parse(cacheUsers);
      return users;
    }

    const users = await User.collection.where('deleted_at', '==', null).fetch();

    const usersEntity: UserEntity[] = [];
    users.list.forEach((user) => {
      const objUser = user.toObject();
      objUser.created_at = new Date(objUser.created_at._seconds * 1000);
      objUser.updated_at = new Date(objUser.updated_at._seconds * 1000);
      const userEntity = new UserEntity(objUser);

      usersEntity.push(userEntity);
    });
    await this.redis.set('users', JSON.stringify(usersEntity));

    return usersEntity;
  }

  async findByUuid(uuid: string): Promise<UserEntity> {
    const cacheUsers = await this.redis.get('users');
    const users = JSON.parse(cacheUsers);

    const cacheUser = users.find((e) => e.uuid === uuid);
    if (cacheUser) {
      return cacheUser;
    }

    const user = await User.collection
      .where('deleted_at', '==', null)
      .where('uuid', '==', uuid)
      .get();

    if (user) {
      const objUser = user.toObject();
      objUser.created_at = new Date(objUser.created_at._seconds * 1000);
      objUser.updated_at = new Date(objUser.updated_at._seconds * 1000);
      const userEntity = new UserEntity(objUser);
      return userEntity;
    }

    return null;
  }

  async findByEmail(email: string): Promise<UserEntity> {
    const user = await User.collection.where('email', '==', email).get();

    if (user) {
      const objUser = user.toObject();
      objUser.created_at = new Date(objUser.created_at._seconds * 1000);
      objUser.updated_at = new Date(objUser.updated_at._seconds * 1000);
      const userEntity = new UserEntity(objUser);
      return userEntity;
    }

    return null;
  }

  async create(userEntity: UserEntity): Promise<UserEntity> {
    const user = User.fromObject(userEntity);
    await user.save();
    return new UserEntity(user.toObject());
  }

  async update(userEntity: UserEntity): Promise<UserEntity> {
    const user = User.fromObject(userEntity);
    await user.update({ id: userEntity['id'] });
    return new UserEntity(user.toObject());
  }
}
