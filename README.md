# interface2class

一个通过 interface 生成 class 的命令行工具

## 安装 

```shell
npm i interface2class -g
```

## 使用

- 文件 `demo.ts`

```typescript
interface Man {
  age: string
  type: 0 | 1
}

interface Person {
  name: string
  age: number
  foods: string[]
  user: Man
}
```

- 执行命令

```shell
i2c ./demo.ts
```

- 自动写入 `demo.ts`

```typescript
interface Man {
  age: string
  type: 0 | 1
}

interface Person {
  name: string
  age: number
  foods: string[]
  user: Man
}

// auto gen →

class ManModel implements Man {
  age: string = ''
  type: 0 | 1 = 0

  constructor(model: Man) {
    this.age = model.age
    this.type = model.type
  }
}

class PersonModel implements Person {
  name: string = ''
  age: number = 0
  foods: string[] = []
  user: ManModel = new ManModel({} as Man)

  constructor(model: Person) {
    this.name = model.name
    this.age = model.age
    this.foods = model.foods
    this.user = model.user
  }
}
```