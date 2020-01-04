import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { animationFrame } from 'rxjs/scheduler/animationFrame';

import { interval } from 'rxjs/observable/interval';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { combineLatest } from 'rxjs/observable/combineLatest';
import { of } from 'rxjs/observable/of';

import {
  map,
  filter,
  scan,
  startWith,
  distinctUntilChanged,
  share,
  withLatestFrom,
  tap,
  skip,
  takeWhile,
  take,
  switchMap,
  first
} from 'rxjs/operators';

import { DIRECTIONS, SPEED, SNAKE_LENGTH, FPS, APPLE_COUNT, POINTS_PER_APPLE } from './constants';
import { Key, Point2D, Scene } from './types';

import {
  createCanvasElement,
  renderScene,
  renderApples,
  renderSnake,
  renderScore,
  renderGameOver,
  getRandomPosition,
  checkCollision
} from './canvas';
import { isNullOrUndefined } from 'util';

import {
  isGameOver,
  nextDirection,
  move,
  eat,
  generateSnake,
  generateApples
} from './utils';
import { PartialObserver, Observer } from 'rxjs/Observer';

/**
 * Create canvas element and append it to the page
 */
let canvas = createCanvasElement();
let ctx: CanvasRenderingContext2D = canvas.getContext('2d') as CanvasRenderingContext2D;
document.body.appendChild(canvas);

/**
 * Starting values
 */
const INITIAL_DIRECTION = DIRECTIONS[Key.RIGHT];

let ticks$ = interval(SPEED);
let click$ = fromEvent(document, 'click');
let keydown$ = fromEvent(document, 'keydown');

console.log('*********************');

let createGame = (fps$: Observable<number>): Observable<Scene> => {
  let direction$ = keydown$.pipe(
    // tap((keyEvent: KeyboardEvent) => console.log('key: ' + keyEvent.keyCode)),
    map((keyEvent: KeyboardEvent) => DIRECTIONS[keyEvent.keyCode]),
    filter((value: Point2D) => !isNullOrUndefined(value)),
    // tap((value: Point2D) => console.log('x: ' + value.x + ', y: ' + value.y)),
    scan(nextDirection, INITIAL_DIRECTION),
    startWith(INITIAL_DIRECTION),
    distinctUntilChanged()
  );

  direction$
    .subscribe((value: Point2D) => { console.log('Value emitted: ' + JSON.stringify(value)); }, (error) => {}, () => {});


  let length$ = new BehaviorSubject<number>(SNAKE_LENGTH);
  // let length$ = new ReplaySubject<number>(2);

  let snakeLength$ = length$.pipe(
    scan((step: number, snakeLen: number) => step + snakeLen),
    tap((value: number) => console.log('Snake length: ' + value)),
    share()
  );

  let score$ = snakeLength$.pipe(
    startWith(0),
    scan((score, _) => score + POINTS_PER_APPLE)
  );

  let snake$ = ticks$.pipe(
    withLatestFrom(direction$, snakeLength$, (_, direction, snakeLength) => [direction, snakeLength]),
    scan(move, generateSnake()),
    tap(() => 'snakeMoves...'),
    share()
  );

  let apples$ = snake$.pipe(
    scan(eat, generateApples()),
    distinctUntilChanged(),
    share()
  );

  let applesEaten$ = apples$.pipe(
    skip(1),
    tap(() => length$.next(POINTS_PER_APPLE)),
  ).subscribe();

  // snake$.subscribe(() => renderScene(ctx, null));
  let scene$: Observable<Scene> = combineLatest(snake$, apples$, score$, (snake, apples, score) => ({snake, apples, score}));

  return fps$.pipe(
    withLatestFrom(scene$, (_, scene: Scene) => scene)
  );
};

// let game$ = interval(1000 / FPS, animationFrame).pipe(
//   withLatestFrom(scene$, (_, scene) => scene),
//   takeWhile((scene: Scene) => !isGameOver(scene))
// ).subscribe((scene: Scene) => { renderScene(ctx, scene); }, () => {}, () => renderGameOver(ctx));

let game$ =  of('Start the game').pipe(
  tap(console.log),
  map(() => interval(1000 / FPS, animationFrame)),
  switchMap((fps$) => createGame(fps$)),
  takeWhile((scene: Scene) => !isGameOver(scene))
);

let startGame = () => {
  game$.subscribe(
    (scene: Scene) => { renderScene(ctx, scene); },
    (e: Error) => { console.log(e); },
    () => {
      renderGameOver(ctx);

      click$.pipe(first()).subscribe(() => startGame());
  });
};

startGame();

export class GameResetter<Scene> implements Observer<Scene> {
  constructor() {}
  next (scene) { renderScene(ctx, scene); }
  error(e: Error) { console.log(e); }
  complete() {
    renderGameOver(ctx);

    click$.pipe(first()).subscribe(() => startGame());
  }
}




// snakeLength$.subscribe((value) => console.log('Observer1 --> value: ' + value) );
// setTimeout(() => {
//   snakeLength$.subscribe((value) => console.log('Observer2 --> value: ' + value) );
// }, 1500);
// setTimeout(() => {
//   snakeLength$.subscribe((value) => console.log('Observer3 --> value: ' + value) );
// }, 4500);

// let interval$ = interval(2000).pipe(
//   take(5),
//   map((value: number) => 1),
//   map((value: number) => length$.next(value))
// );
// interval$.forEach(() => {});

// export function nextDirection(previous: Point2D, next: Point2D): Point2D {
//   if (previous === next) return next;

//   console.log('Is opposite: ' + isOpposite(previous, next));

//   return isOpposite(previous, next) ? previous : next;
// }

// export function isOpposite(previous: Point2D, next: Point2D): boolean {
//   return previous.x === next.x * -1 || previous.y === next.y * -1;
// }