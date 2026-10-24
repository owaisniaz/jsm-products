import {Exclude} from "class-transformer";
export class UserDto {
    username:string;
    @Exclude()
    password:string;
    photo:string;
    roles:string[];
}