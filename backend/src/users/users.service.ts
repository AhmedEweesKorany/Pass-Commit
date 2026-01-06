import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

export interface CreateUserDto {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    console.log('Creating user in MongoDB:', createUserDto.email);
    const user = new this.userModel(createUserDto);
    const savedUser = await user.save();
    console.log('User saved successfully with ID:', savedUser._id);
    return savedUser;
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async updateSalt(userId: string, salt: string): Promise<User | null> {
    console.log('Updating salt for user:', userId);
    return this.userModel
      .findByIdAndUpdate(userId, { salt }, { new: true })
      .exec();
  }
}
