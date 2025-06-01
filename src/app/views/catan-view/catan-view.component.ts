import { Component, OnInit } from '@angular/core';
import { CatanBoardComponent } from 'src/app/catan/components/catan-board/catan-board.component';

@Component({
  selector: 'ctn-catan-view',
  imports: [CatanBoardComponent],
  standalone: true,
  templateUrl: './catan-view.component.html',
  styleUrls: ['./catan-view.component.scss']
})
export class CatanViewComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
