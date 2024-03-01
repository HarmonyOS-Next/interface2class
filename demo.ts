type ResourceStr = ''

enum Gender {
  MAN = 'men',
  WOMAN = 'women'
}

interface Response {
  code: number
  message: string
  data: User
}

interface User {
  nickname: string
  age: number
  avatar: ResourceStr
  createAt: Date 
  gender: Gender
  hobby: string[]
  follows: User[]
  isValid: 0 | 1
}

// auto gen →

export class ResponseModel implements Response {
  code: number = 0
  message: string = ''
  data: User = new UserModel()
}
export class UserModel implements User {
  nickname: string = ''
  age: number = 0
  avatar: ResourceStr = ''
  createAt: Date = new Date()
  gender: Gender = Gender.MAN
  hobby: string[] = []
  follows: User[] = []
  isValid: 0 | 1 = 0
}
