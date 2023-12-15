enum TYPE {
  N,
  B
}

interface Man {
  age: string
  type: 0 | 1,
  test: TYPE
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
  test: TYPE = TYPE.N

  constructor(model: Man) {
    this.age = model.age
    this.type = model.type
    this.test = model.test
  }
}
class PersonModel implements Person {
  name: string = ''
  age: number = 0
  foods: string[] = []
  user: Man = new ManModel({} as Man)

  constructor(model: Person) {
    this.name = model.name
    this.age = model.age
    this.foods = model.foods
    this.user = model.user
  }
}
