import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true,minLength:3,maxLength:25 })
  username!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({required:true,minLength:6,maxLength:25})
  password!:string;

  @Prop({required:false})
  photo!:string;

  @Prop({default:true})
  isActive!:boolean;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }], default: [] })
  roles!: mongoose.Types.ObjectId[];

}

export const UserSchema = SchemaFactory.createForClass(User);
