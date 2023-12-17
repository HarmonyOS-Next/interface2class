# interface2class

一个通过 `interface` 生成 `class` 的命令行工具，适用于 `TS` 和 `ArkTS`

## 安装 

```shell
npm i interface2class -g
```

## 使用

- 文件 `demo.ts`

```typescript
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
```

- 执行命令

```shell
i2c ./demo.ts
```

- 自动写入 `demo.ts`

```typescript
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
  data: User = new UserModel({} as User)

  constructor(model: Response) {
    this.code = model.code
    this.message = model.message
    this.data = model.data
  }
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

  constructor(model: User) {
    this.nickname = model.nickname
    this.age = model.age
    this.avatar = model.avatar
    this.createAt = model.createAt
    this.gender = model.gender
    this.hobby = model.hobby
    this.follows = model.follows
    this.isValid = model.isValid
  }
}
```