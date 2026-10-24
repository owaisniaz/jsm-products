import { Controller, Post } from '@nestjs/common';
import { UserDto } from './dtos/user.dto.js';
@Controller('auth/')
export class AuthController {
    @Post("signup")
    async signup(body:UserDto){
        return {
            
        }
    }
}
