import { AfterViewInit, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { OptimizationService, GlobalPlanEntry } from '../services/optimization.service';
import { ChartConfiguration, Chart, ChartType, registerables, ScriptableContext } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import { FormsModule } from '@angular/forms';
import { Nodes } from './nodes';
import { LoadingSpinnerChartComponent } from "../loading-spinner-chart/loading-spinner-chart.component";
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { NodeService } from '../services/node.service';
import { UsersService } from '../services/users.service';

@Component({
  selector: 'app-optimization',
  standalone: true,
  imports: [CommonModule, NgChartsModule, FormsModule, LoadingSpinnerChartComponent],
  templateUrl: './optimization.component.html',
  styleUrls: ['./optimization.component.css']
})
export class OptimizationComponent implements OnInit, AfterViewInit {
  chartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: { title: { display: true, text: 'Global Plan Evolution Over Time' } },
    scales: {
      x: { title: { display: true, text: 'Timp (ora/minut)' } },
      y: { title: { display: true, text: 'Consum (kWh)' } }
    }
  };

  heatmapData: any;
  heatmapOptions: any;
  isLoading: boolean = false;
  isLoadingChart: boolean = false;
  isLoading1: boolean = false;
  selectedHour: number = 0;
  planForHour: number | null = null;
  optimalPlanArray: number[] = [];
  lastUpdatedTime: string | null = null;
  frozenCost: number | null = null;
  username: string = '';
  bestGlobalPlan: number[] = [];
  public userRole: 'MANAGER' | 'USER' | null = null;

  costBeforeOptimization: number | null = null;

  position: number[] = [];
  personalBestPosition: number[] = [];
  personalBestScore: number = 0;
  currentCost: number = 0;

  tariff: number[] = [];
  capacity: number[] = [];
  batteryCharge: number[] = [];
  batteryCapacity: number[] = [];
  renewableGeneration: number[] = [];
  flexibilityAbove: number[] = [];
  flexibilityBelow: number[] = [];

  positionChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  tariffChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  batteryChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  capacityChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };

  initialPosition: number[] = [];

  initialTariff: number[] = [];
  optimizedTariff: number[] = [];

  private batteryDataReady = {
    charge: false,
    capacity: false,
    renewable: false
  };

  // Pentru grafice de tip "line" (poziții, capacitate)
  chartLineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      title: { display: true, text: 'Grafic linie' }
    },
    scales: {
      x: { title: { display: true, text: 'Ora' } },
      y: { title: { display: true, text: 'Valoare' } }
    }
  };

  // Pentru grafice de tip "bar" (tarife, baterie)
  chartBarOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: {
      title: { display: true, text: 'Grafic bară' }
    },
    scales: {
      x: { title: { display: true, text: 'Ora' } },
      y: { title: { display: true, text: 'Valoare' } }
    }
  };


  constructor(private optimizationService: OptimizationService, private router: Router, private authService: AuthService, private nodeService: NodeService, private usersService: UsersService) {
    this.authService.user$.subscribe(user => {
      this.userRole = user?.roles?.[0] || null;
      this.username = user?.username || null;
    })
  }

  fetchPlanForHour(): void {
    this.isLoading1 = true;
    this.planForHour = null; // Resetăm valoarea anterioară

    this.optimizationService.getOptimalPlanForHour(this.selectedHour).subscribe({
      next: (result) => {
        const val = typeof result === 'object' && 'globalOptimalPlanHour' in result
          ? result.globalOptimalPlanHour
          : result;

        // Adaugăm delay de 3 secunde
        setTimeout(() => {
          this.planForHour = Number(val);
          this.isLoading1 = false;
        }, 3000);
      },
      error: (err) => {
        console.error('❌ Eroare la fetchPlanForHour:', err);
        this.isLoading1 = false;
      }
    });
  }



  ngOnInit(): void {
    Chart.register(...registerables, MatrixController, MatrixElement);
    this.loadData();
    this.loadNodeData();
    this.loadInitialNodeData();
    this.calculateInitialCost();
  }

  loadData(): void {
    this.isLoadingChart = true;
    this.optimizationService.getPlanHistory().subscribe(data => {
      this.processChartData(data);
      this.prepareHeatmapData(data);
      setTimeout(() => {
        this.isLoadingChart = false;
      }, 10000); // 10 secunde delay
    });

    this.optimizationService.getFrozenGlobalCost().subscribe(result => {
      this.frozenCost = Number(result.frozenGlobalCost);
      console.log('Frozen Global Cost:', this.frozenCost);
    });

    this.optimizationService.getLastUpdatedTimestamp().subscribe(result => {
      const date = new Date(Number(result.lastUpdatedTimestamp) * 1000);
      this.lastUpdatedTime = date.toLocaleString();
    });

    this.optimizationService.getBestGlobalPlan().subscribe(result => {
      this.bestGlobalPlan = Array.isArray(result.bestGlobalPlan)
        ? result.bestGlobalPlan.map((x: string) => Number(x))
        : [];
    });
  }




  ngAfterViewInit(): void {
    const elements = document.querySelectorAll('.fade-in, .fade-out');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        } else {
          entry.target.classList.remove('in-view');
        }
      });
    }, {
      threshold: 0.2
    });

    elements.forEach(el => observer.observe(el));
  }

  processChartData(entries: GlobalPlanEntry[]): void {
    const labels = entries.map(entry => new Date(Number(entry.timestamp) * 1000).toLocaleTimeString());
    const numHours = entries[0]?.plan.length || 0;
    const datasets = Array.from({ length: numHours }, (_, i) => ({
      label: `Hour ${i + 1}`,
      data: entries.map(e => +e.plan[i]),
      borderWidth: 2,
      fill: false,
      tension: 0.4
    }));
    this.chartData = { labels, datasets };
  }

  prepareHeatmapData(entries: GlobalPlanEntry[]): void {
    const matrixData = entries.flatMap((entry, row) =>
      entry.plan.map((value, col) => ({ x: col, y: row, v: +value }))
    );

    this.heatmapData = {
      datasets: [{
        label: 'Heatmap',
        data: matrixData,
        backgroundColor: (ctx: ScriptableContext<'matrix'>) => {
          const v = (ctx.dataset.data as any[])[ctx.dataIndex].v;
          if (v < 60) return 'rgba(0, 123, 255, 0.8)';
          if (v < 80) return 'rgba(0, 200, 255, 0.7)';
          if (v < 100) return 'rgba(255, 205, 0, 0.7)';
          if (v < 120) return 'rgba(255, 140, 0, 0.8)';
          return 'rgba(255, 0, 0, 0.9)';
        },
        borderWidth: 1,
        width: () => 20,
        height: () => 20
      }]
    };

    this.heatmapOptions = {
      responsive: true,
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Ora' },
          offset: true,
          ticks: {
            stepSize: 1,
            callback: (value: number) => value
          }
        },
        y: {
          title: { display: true, text: 'Iterație' },
          offset: true,
          ticks: {
            callback: (value: number) => value + 1
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx: { raw: { v: number } }) => {
              const v = ctx.raw.v;
              let level = '🔵 Low';
              if (v >= 60 && v < 80) level = '🟢 Good';
              else if (v >= 80 && v < 100) level = '🟡 Medium';
              else if (v >= 100 && v < 120) level = '🟠 High';
              else if (v >= 120) level = '🔴 Extreme';
              return `Consum: ${v} kWh (${level})`;
            }
          }
        }
      }
    };
  }

  calculateInitialCost(): void {
    let totalCost = 0;
    for (const node of Nodes) {
      for (let i = 0; i < node.initialPosition.length; i++) {
        totalCost += node.initialPosition[i] * node.initialTariff[i];
      }
    }
    this.costBeforeOptimization = totalCost;
    console.log('💰 Cost inițial al rețelei:', totalCost);
  }

  // Load node data for charts

  loadInitialNodeData(): void {
    if (!this.username) return;
   
    this.usersService.getConsumptionPointByUsername(this.username).subscribe(response => {
      const nodeName = response.name;
      const nodeIndex = Number(nodeName.split(' ')[1]) - 1;

      if (!isNaN(nodeIndex) && Nodes[nodeIndex]) {
        this.initialPosition = Nodes[nodeIndex].initialPosition;
        this.initialTariff = Nodes[nodeIndex].initialTariff;
        this.updatePositionChart(); // re-render chart with initial position
      } else {
        console.warn("⚠️ Index nod invalid sau nod inexistent:", nodeName);
      }
    });
  }

  loadNodeData(): void {
    if (!this.username) return;

    // Plan actual
    this.nodeService.getPosition(this.username).subscribe(data => {
      this.position = data;
      this.updatePositionChart();
    });

    // Plan optim anterior
    this.nodeService.getPersonalBestPosition(this.username).subscribe(response => {
      this.personalBestPosition = response;
      this.updatePositionChart();
    });

    // Costuri
    this.nodeService.getPersonalBestScore(this.username).subscribe(score => {
      this.personalBestScore = +score;
    });

    this.nodeService.getObjectiveFunction(this.username).subscribe(data => {
      this.currentCost = +data.result;
      console.log("Current cost:", this.currentCost);
    });

    this.nodeService.getFrozenCost(this.username).subscribe(result => {
      console.log("🧊 Received frozenCost result:", result);
      this.frozenCost = result?.frozenCost !== undefined ? +result.frozenCost : null;
      console.log("Frozen cost:", this.frozenCost);
    });

    // 🔌 Tarife
    this.nodeService.getTariff(this.username).subscribe(data => {
      this.tariff = data;
      this.optimizedTariff = data;
      console.log("🎯 Tariff response as numbers:", this.tariff);
      this.updateTariffChart();
    });

    // ⚙️ Capacitate maximă
    this.nodeService.getCapacity(this.username).subscribe(data => {
      this.capacity = data;
      this.updateCapacityChart();
    });

    // 🔋 Încărcare baterie
    this.nodeService.getBatteryCharge(this.username).subscribe(data => {
      this.batteryCharge = data;
      console.log("🔋 batteryCharge", this.batteryCharge);
      this.batteryDataReady.charge = true;
      this.checkIfBatteryReady();
    });

    // 📦 Capacitate baterie
    this.nodeService.getBatteryCapacity(this.username).subscribe(data => {
      this.batteryCapacity = data.map(Number);
      this.batteryDataReady.capacity = true;
      this.checkIfBatteryReady();
    });

    // ☀️ Producție regenerabilă
    this.nodeService.getRenewableGeneration(this.username).subscribe(data => {
      this.renewableGeneration = data.map(Number);
      this.batteryDataReady.renewable = true;
      this.checkIfBatteryReady();
    });


    // ↕️ Flexibilitate peste
    this.nodeService.getFlexibilityAbove(this.username).subscribe(data => {
      if (!Array.isArray(data)) {
        console.error('❌ FlexibilityAbove response invalid:', data);
        return;
      }
      this.flexibilityAbove = data.map(Number);
      this.checkIfCapacityReady();
    });

    // ↕️ Flexibilitate sub
    this.nodeService.getFlexibilityBelow(this.username).subscribe(data => {
      if (!Array.isArray(data)) {
        console.error('❌ FlexibilityBelow response invalid:', data);
        return;
      }
      this.flexibilityBelow = data.map(Number);
      this.checkIfCapacityReady();
    });


  }


  checkIfCapacityReady() {
    if (
      this.capacity.length &&
      this.flexibilityAbove.length &&
      this.flexibilityBelow.length
    ) {
      this.updateCapacityChart();
    }
  }

  checkIfBatteryReady(): void {
    const b = this.batteryDataReady;
    if (
      b.charge &&
      b.capacity &&
      b.renewable &&
      this.batteryCharge.length &&
      this.batteryCapacity.length &&
      this.renewableGeneration.length
    ) {
      this.updateBatteryChart();
      this.batteryDataReady = { charge: false, capacity: false, renewable: false };
    }
  }


  triggerGlobalComputation(): void {
    this.isLoading = true;
    this.isLoadingChart = true;
    this.optimizationService.computeGlobalPlan().subscribe({
      next: () => {
        this.loadData();
        this.isLoading = false;
        this.isLoadingChart = true;
      },
      error: (err) => {
        console.error(' Eroare la recalculare:', err);
        this.isLoading = false;
        this.isLoadingChart = true;
      }
    });
  }

  updatePositionChart(): void {
    if (!Array.isArray(this.position) || !Array.isArray(this.personalBestPosition)) {
      console.error(" Datele pentru graficul poziției nu sunt valide", this.position, this.personalBestPosition);
      return;
    }

    const labels = this.position.map((_, i) => `Ora ${i}`);
    const initialPosition = this.initialPosition;

    this.positionChartData = {
      labels,
      datasets: [
        {
          label: 'Plan actual',
          data: this.position,
          borderColor: 'blue',
          backgroundColor: 'rgba(0,0,255,0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Plan optim anterior',
          data: this.personalBestPosition,
          borderColor: 'green',
          backgroundColor: 'rgba(0,255,0,0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Plan inițial',
          data: initialPosition,
          borderColor: 'red',
          backgroundColor: 'rgba(128,128,128,0.1)',
          fill: true,
          tension: 0.3
        }
      ]
    };
  }



  updateTariffChart(): void {
    const labels = this.tariff.map((_, i) => `Ora ${i}`);
    this.tariffChartData = {
      labels,
      datasets: [
        {
          label: 'Tarif (bani/kWh)',
          data: this.tariff,
          backgroundColor: 'rgba(255, 159, 64, 0.7)'
        }
      ]
    };
  }

  updateBatteryChart(): void {
    if (
      !this.batteryCharge?.length ||
      !this.batteryCapacity?.length ||
      !this.renewableGeneration?.length
    ) {
      console.warn("⚠️ Unul din seturile de date pentru baterie este gol");
      return;
    }

    const labels = this.batteryCharge.map((_, i) => `Ora ${i}`);
    this.batteryChartData = {
      labels,
      datasets: [
        {
          label: 'Încărcare baterie',
          data: this.batteryCharge,
          backgroundColor: 'rgba(54, 162, 235, 0.6)'
        },
        {
          label: 'Capacitate baterie',
          data: this.batteryCapacity,
          backgroundColor: 'rgba(153, 102, 255, 0.6)'
        },
        {
          label: 'Producție regenerabilă',
          data: this.renewableGeneration,
          backgroundColor: 'rgba(75, 192, 192, 0.6)'
        }
      ]
    };

    console.log("✅ Battery chart data (actualizat):", this.batteryChartData);
  }


  updateCapacityChart(): void {
    const labels = this.capacity.map((_, i) => `Ora ${i}`);
    const minFlex = this.flexibilityBelow.map((v, i) => -v);
    const maxFlex = this.flexibilityAbove;

    this.capacityChartData = {
      labels,
      datasets: [
        {
          label: 'Capacitate maximă',
          data: this.capacity,
          borderColor: 'orange',
          fill: false,
          tension: 0.3
        },
        {
          label: 'Flexibilitate peste',
          data: maxFlex,
          borderColor: 'green',
          borderDash: [5, 5],
          fill: false
        },
        {
          label: 'Flexibilitate sub',
          data: minFlex,
          borderColor: 'red',
          borderDash: [5, 5],
          fill: false
        }
      ]
    };
    console.log("Capacity chart data:", this.capacityChartData);
  }

  get initialTariffAverage(): number | null {
    return this.initialTariff.length > 0
      ? this.initialTariff.reduce((a, b) => a + b, 0)
      : null;
  }

  get initialTotalCost(): number | null {
    if (!this.initialPosition.length || !this.initialTariff.length) return null;
    return this.initialPosition.reduce((acc, val, i) => acc + val * this.initialTariff[i], 0)/100;
  }
  
  
  get optimizedTariffAverage(): number | null {
    return this.tariff.length > 0
      ? this.tariff.reduce((a, b) => a + b, 0) 
      : null;
  }

  get optimizedTotalCost(): number | null {
    if (!this.position.length || !this.tariff.length) return null;
    return this.position.reduce((acc, val, i) => acc + val * this.tariff[i], 0)/100;
  }
  

}
