import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NodeService {
  private apiUrl = 'http://localhost:3000/blockchain-api/nodes';

  constructor(private http: HttpClient) {}

  getPosition(username: string): Observable<number[]> {
    return this.http.get<{ position: (string | number)[] }>(`${this.apiUrl}/position/${username}`).pipe(
      map(response => response.position.map(Number))
    );
  }

  getPersonalBestPosition(username: string): Observable<number[]> {
    return this.http.get<{ position: (number | string)[] }>(`${this.apiUrl}/personalBestPosition/${username}`).pipe(
      map(response => response.position.map(Number))
    );
  }
  
  

  getPersonalBestScore(username: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/personalBestScore/${username}`);
  }

  getFrozenCost(username: string): Observable<{ frozenCost: number }> {
    return this.http.get<{ frozenCost: number }>(`${this.apiUrl}/frozenCost/${username}`);
  }
  

  getObjectiveFunction(username: string): Observable<{ result: number | string }> {
    return this.http.get<{ result: number | string }>(`${this.apiUrl}/objectiveFunction/${username}`);
  }

  getEffectiveTariff(username: string, hour: number, consumption: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/effectiveTariff/${username}/${hour}/${consumption}`);
  }

  updateBestPositions(username: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/updateBestPositions/${username}`, {});
  }

  updateVelocity(username: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/updateVelocity/${username}`, {});
  }

  getTariff(username: string): Observable<number[]> {
    return this.http.get<{ tariff: number[] }>(`${this.apiUrl}/tariff/${username}`).pipe(
      tap(res => console.log('🔌 Tarif response:', res)),
      map(response => response.tariff)
    );
  }

  getCapacity(username: string): Observable<number[]> {
    return this.http.get<{ capacity: number[] }>(`${this.apiUrl}/capacity/${username}`).pipe(
      map(response => response.capacity)
    );
  }

  getBatteryCharge(username: string): Observable<number[]> {
    return this.http.get<(number | string)[]>(`${this.apiUrl}/batteryCharge/${username}`).pipe(
      map((response) => response.map(Number))
    );
  }
  
  getBatteryCapacity(username: string): Observable<number[]> {
    return this.http.get<{ batteryCapacity: (number | string)[] }>(`${this.apiUrl}/batteryCapacity/${username}`).pipe(
      map(response => response.batteryCapacity.map(Number))
    );
  }
  
  getRenewableGeneration(username: string): Observable<number[]> {
    return this.http.get<{ renewableGeneration: (number | string)[] }>(`${this.apiUrl}/renewableGeneration/${username}`).pipe(
      map(response => response.renewableGeneration.map(Number))
    );
  }

  getFlexibilityAbove(username: string): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/flexibilityAbove/${username}`);
  }
  
  getFlexibilityBelow(username: string): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/flexibilityBelow/${username}`);
  }
}
