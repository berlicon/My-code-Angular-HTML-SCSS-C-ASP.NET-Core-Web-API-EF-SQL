//проверить, какое количество символов из S входит в J
//----------------я проверял в https://jsfiddle.net ------------------------
function counter(jewels, stones) {
    let result = 0;
    for (let i = 0; i < stones.length; i++) {
        if (jewels.includes(stones.charAt(i))) {
            ++result;
        }
    }
    return result;
}

console.log(counter('ab','aabbccd') == 4);
console.log(counter('d','aabbccd') == 1);
console.log(counter('e','aabbccd') == 0);
console.log(counter('','aabbccd') == 0);
console.log(counter(null,'aabbccd') == 0);
//-----------------------------------------------------------

//Требуется найти в бинарном векторе самую длинную последовательность единиц и вывести её длину.
function counter(source) {
  let result = 0;
  let bestResult = 0;

  for (let i = 0; i < source.length; i++) {
    if (source[i] == 1) {
      ++result;
    } else {
      if (result > bestResult) {
        bestResult = result;
      }
      result = 0;
    }
  }

  if (result > bestResult) {
    bestResult = result;
  }

  return bestResult;
}

console.log(counter([1, 0, 1, 0, 1]) == 1);
console.log(counter([1, 0, 0, 1, 1]) == 2);
console.log(counter([0, 0, 0, 0, 0]) == 0);
console.log(counter([]) == 0);
console.log(counter([1, 1, 1, 1, 1]) == 5);
//-----------------------------------------------------------

//Дан упорядоченный по неубыванию массив целых 32-разрядных чисел. Требуется удалить из него все повторения.
function deleteDuplicates(source) {
	let result = [];
  
  for (let i = 0; i < source.length; i++) {
    if (i == 0 || source[i] != source[i-1]) {
      result.push(source[i]);
    }
  }

  return result;
}

console.log(deleteDuplicates([2,4,8,8,8]).toString() == [2,4,8].toString());
console.log(deleteDuplicates([2,4,4,8,8,8,9]).toString() == [2,4,8,9].toString());
console.log(deleteDuplicates([]).toString() == [].toString());
//-----------------------------------------------------------

//Дано целое число n. Требуется вывести все правильные скобочные последовательности длины 2 * n,
//упорядоченные лексикографически (см. https://ru.wikipedia.org/wiki/Лексикографический_порядок).
//В задаче используются только круглые скобки.
function generate(cur, open, closed, n) {
	if (cur.length == 2 * n) {
  	console.log(cur);
    return;  
  }
  if (open < n) generate(cur + '(', open+1, closed, n);
  if (closed < open) generate(cur + ')', open, closed+1, n);
}

console.log(generate(1) == '()');
console.log(generate(2) == '(())' + '\n' + '()()');
console.log(generate(3) == '((()))' + '\n' + '(()())' + '\n' + '(())()' + '\n' + '()(())' + '\n' + '()()()');
//-----------------------------------------------------------

//Даны две строки, состоящие из строчных латинских букв. Требуется определить, являются ли эти строки анаграммами, т. е. отличаются ли они только порядком следования символов.

function areAnagrams(one, two) {
 	if (one.length != two.length) return false;
  
  let hashOne = {};
  let hashTwo = {};
  for(let i = 0; i < one.length; i++) {
  	if (hashOne[one[i]]) {
    	hashOne[one[i]] = hashOne[one[i]]+1;
    } else {
    	hashOne[one[i]] = 1;    
    }
  	if (hashTwo[two[i]]) {
    	hashTwo[two[i]] = hashTwo[two[i]]+1;
    } else {
    	hashTwo[two[i]] = 1;
    }  
  } 
  
  //console.log(hashOne);
  //console.log(hashTwo);  
  
  let eq = objectEquals(hashOne, hashTwo);  
	return eq;
}

function objectEquals(obj1, obj2) {
    for (var i in obj1) {
        if (obj1.hasOwnProperty(i)) {
            if (!obj2.hasOwnProperty(i)) return false;
            if (obj1[i] != obj2[i]) return false;
        }
    }
    for (var i in obj2) {
        if (obj2.hasOwnProperty(i)) {
            if (!obj1.hasOwnProperty(i)) return false;
            if (obj1[i] != obj2[i]) return false;
        }
    }
    return true;
}


console.log(areAnagrams('ABBA','BBAA') == true);
console.log(areAnagrams('qiu','iuq') == true);
console.log(areAnagrams('q','q') == true);
console.log(areAnagrams('','') == true);
console.log(areAnagrams('zpprrr','rrrzpp') == true);
console.log(areAnagrams('zprl','zprc') == false);
console.log(areAnagrams('zprl','z') == false);
//-----------------------------------------------------------

//Подсчитать количество вхождений символа в строку
function countSymbol(str, symbol) {
	var regex = new RegExp(symbol, 'g');
	let result = (str.match(regex) || []).length;
  return result;
}

console.log(countSymbol('Hello', 'o')==1); // 1
console.log(countSymbol('Hello', 'l')==2); // 2
console.log(countSymbol('Hello', 'H')==1); // 1
console.log(countSymbol('Hello', 'h')==0); // 0
//-----------------------------------------------------------

/*
Роботизированное агентство «Двое из ларца» занимается выполнением задач любой сложности за деньги клиентов. Работает агентство по принципу «одного окна». Сначала заказчик приносит список работ, которые нужно выполнить, с указанием приоритета каждой из них. Затем робот-менеджер вывешивает табличку «Ушёл на базу», уходит контролировать работу роботов-исполнителей, а когда те всё выполнят — возвращается и отдаёт клиентам отчёт о выполненных работах с квитанцией на оплату. Оплачивается только время активной работы роботов, без учёта простоя.
Чтобы клиенты могли заранее посчитать свои будущие расходы, вам нужно реализовать симулятор рабочего процесса в агентстве.

Формат ввода
Задачи для исполнения от заказчика имеют следующий формат:
const task = {  
    // строка, уникальный идентификатор задачи  
    id: "a1",  
    // число, приоритет задачи (от 1 до 1024)  
    priority: 10,  
    // функция, возвращающая Promise;  
    // Promise может быть resolved через длительное время  
    job: () => {  
        return new Promise((resolve, reject) => {  
            if (...) {  
                ...  
                resolve();  
            } else reject();  
        });  
    }  
};
Приоритет задачи — целое число. Чем больше число, тем больший приоритет у задачи.
Вам нужно реализовать класс TaskManager со следующими методами:
class TaskManager {  
    constructor(  
        N // общее число роботов-исполнителей (от 1 до 1024)  
    );  
    // Добавление задачи в очередь  
    addToQueue(  
        task // задача для исполнения, см. формат выше  
    );  
    // Promise, который запускает процесс выполнения задач и выдаёт список отчётов  
    run();  
}  
 
module.exports = { TaskManager };
У робота-менеджера две фазы работы:

Получение задач в очередь. В этот момент синхронно или асинхронно в очередь добавляются задачи при помощи вызова метода addToQueue. Количество задач не ограничено.
Выполнение задач после вызова метода run. Все полученные ранее задачи берутся на выполнение. Свободные роботы берут задачи из очереди: самая приоритетная задача берётся первой, далее — по уменьшению приоритета и по времени поступления задачи в очередь.
Каждый робот в процессе формирует отчёт о выполнении работ:
{  
    // число — общее количество выполненных успешно задач  
    successCount: 2,  
    // число — общее количество невыполненных задач  
    failedCount: 1,  
    // массив строк — идентификаторы взятых задач по очереди  
    tasks: ["a1", "c3", "d4"],  
    // число — количество проведённых в работе миллисекунд  
    timeSpent: 203,  
}
Задача может выполниться неуспешно (reject). Если успешно, то робот добавляет единицу в статистику к successCount. Если задача выполнилась неуспешно, то добавляет единицу к failedCount. Задача всё равно попадает в итоговый отчёт и учитывается в итоговом времени работы робота.

Формат вывода
Метод run менеджера возвращает Promise, который при resolve возвращает отчёт о проделанной роботами работе в виде массива отчётов каждого робота:
[  
    {  
        successCount: 2,  
        failedCount: 0,  
        tasks: ["a1", "d4"],  
        timeSpent: 203,  
    }, // отчёт робота номер 1  
    ...,  
    {  
        successCount: 1,  
        failedCount: 1,  
        tasks: ["b2", "c3"],  
        timeSpent: 10,  
    }, // отчёт робота номер N  
]
Примечания
Примерный код для тестирования задачи:
(async () => {  
    const generateJob = (id) =>  
        function () {  
            return new Promise((resolve, reject) => {  
                setTimeout(() => {  
                    Math.random() > 0.8 ? resolve() : reject();  
                }, Math.random() * 2000);  
            });  
        };  
 
    const tm = new TaskManager(3);  
 
    tm.addToQueue({  
        id: "id0",  
        priority: 10,  
        job: generateJob("id0"),  
    });  
    tm.addToQueue({  
        id: "id1",  
        priority: 1,  
        job: generateJob("id1"),  
    });  
    tm.addToQueue({  
        id: "id2",  
        priority: 10,  
        job: generateJob("id2"),  
    });  
    tm.addToQueue({  
        id: "id3",  
        priority: 5,  
        job: generateJob("id3"),  
    });  
 
    const report = await tm.run();  
    console.log(report);  
})();
*/

// Доработал, не паралельно все выполняются а последовательно работы а так вроде норм возвращает результат
class TaskManager { 
tasks = [];
report = [];
n = 0;

		constructor(
			N // общее число роботов-исполнителей (от 1 до 1024)  
		) {
			this.n = N;
			for(let i = 0; i < this.n; i++) {
				this.report[i] = {  
							successCount: 0,  
							failedCount: 0,  
							tasks: [],  
							timeSpent: 0,  
					};
			}
		}		
	
    // Добавление задачи в очередь  
    addToQueue(  
        task // задача для исполнения, см. формат выше  
    ) {
			//console.log('addToQueue');
				this.tasks.push(task);
			}
    
		// Promise, который запускает процесс выполнения задач и выдаёт список отчётов  
    async run() {
		//debugger;
			//console.log('run');
			//let report = [];
			
			let filteredTasks = this.tasks.sort((a, b) => a.priority - b.priority); // sort 0-10
			//console.log(filteredTasks);
			let filteredTasksIds = filteredTasks.map(t => t.id);
			//console.log(filteredTasksIds);
			
			let randomIndex = -1;
			
			while(true) {
				if (filteredTasks.length > 0) {
				 let task = filteredTasks.pop();
				 //const randomIndex = Math.floor(Math.random() * this.n);
				 randomIndex = (randomIndex < this.n - 1) ? randomIndex + 1 : 0;

					var currentTime = new Date();
					await task.job()
						.then((res) => {
							//console.log('Experiment OK ' + task.id);		
							
							this.report[randomIndex].successCount = this.report[randomIndex].successCount + 1;
							this.report[randomIndex].tasks = [task.id, ...this.report[randomIndex].tasks];
							this.report[randomIndex].timeSpent = this.report[randomIndex].timeSpent + (new Date().getTime() - currentTime.getTime());
						})
						.catch((err) => {
							//console.log('Experiment failed ' + task.id);
							//console.error(err);
							
							this.report[randomIndex].failedCount = this.report[randomIndex].failedCount + 1;
							this.report[randomIndex].tasks = [task.id, ...this.report[randomIndex].tasks];
							this.report[randomIndex].timeSpent = this.report[randomIndex].timeSpent + (new Date().getTime() - currentTime.getTime());
						})
						.finally(() => {
							//console.log('Experiment finally ' + task.id);
						});				 
				} else {
					break;
				}			
			}
			
			return new Promise((resolve, reject) => {
				// через 1 секунду готов результат: result
				setTimeout(() => resolve(this.report), 10);
				// через 2 секунды — reject с ошибкой, он будет проигнорирован
				setTimeout(() => reject(new Error("ignored")), 2000);
			});			
		}  
}

//--------

(async () => {  
    const generateJob = (id) =>  
        function () {  
            return new Promise((resolve, reject) => {  
                setTimeout(() => {  
                    Math.random() > 0.8 ? resolve() : reject();  
                }, Math.random() * 1000);  
            });  
        };  
 
    const tm = new TaskManager(3);  
 
   tm.addToQueue({  
        id: "id0",  
        priority: 10,  
        job: generateJob("id0"),  
    });  
    tm.addToQueue({  
        id: "id1",  
        priority: 1,  
        job: generateJob("id1"),  
    });  
    tm.addToQueue({  
        id: "id2",  
        priority: 10,  
        job: generateJob("id2"),  
    });  
    tm.addToQueue({  
        id: "id3",  
        priority: 5,  
        job: generateJob("id3"),  
    });  
    tm.addToQueue({  
        id: "id4",  
        priority: 5,  
        job: generateJob("id4"),  
    });
 
    const report = await tm.run();  
		//debugger;
    console.log(report);  
})();

module.exports = { TaskManager };
//-----------------------------------------------------------