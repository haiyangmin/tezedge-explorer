import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatTableDataSource } from '@angular/material';

import { Store } from '@ngrx/store'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'

@Component({
  selector: 'app-networking-peers',
  templateUrl: './networking-peers.component.html',
  styleUrls: ['./networking-peers.component.css']
})
export class NetworkingPeersComponent implements OnInit {

  public networkingPeersList
  public networkingPeersMetrics
  public tableDataSource
  public onDestroy$ = new Subject()

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;

  constructor(
    public store: Store<any>,
  ) { }

  ngOnInit() {

    // wait for data changes from redux    
    this.store.select('networkingPeers')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(data => {

        this.networkingPeersList = data.ids.map(id => ({ id, ...data.entities[id] }))

        this.networkingPeersMetrics = data.metrics;

        this.tableDataSource = new MatTableDataSource<any>(this.networkingPeersList);

        this.tableDataSource.paginator = this.paginator;

      })

  }

  ngOnDestroy() {

    // close all observables
    this.onDestroy$.next();
    this.onDestroy$.complete();

  }


}