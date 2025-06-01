import { AfterViewInit, Component, OnDestroy, OnInit } from "@angular/core";

@Component({
  selector: 'ctn-catan-dice',
  standalone: true,
  templateUrl: './catan-dice.component.html'
})
export class CatanDiceComponent implements OnInit {
  die1!: number;
  die2!: number;

  ngOnInit(): void {
    this.rollDice();
  }

  rollDice() {
    this.die1 = this.rollDie();
    this.die2 = this.rollDie();
  }

  // TODO: Consider using real randomness over pseudo-random Math.random() function.
  private rollDie(): number {
    return Math.ceil(Math.random() * 6);
  }
}
