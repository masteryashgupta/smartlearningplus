#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#ifdef _OPENMP
#include <omp.h>
#endif

#define CUTOFF 10000

double now(void) {
#ifdef _OPENMP
    return omp_get_wtime();
#else
    return (double)clock() / CLOCKS_PER_SEC;
#endif
}

void merge(int arr[], int tmp[], int l, int m, int r) {
    int i = l, j = m + 1, k = l;
    while (i <= m && j <= r) {
        if (arr[i] <= arr[j]) tmp[k++] = arr[i++];
        else tmp[k++] = arr[j++];
    }
    while (i <= m) tmp[k++] = arr[i++];
    while (j <= r) tmp[k++] = arr[j++];
    memcpy(arr + l, tmp + l, (r - l + 1) * sizeof(int));
}

void mergeSortSeq(int arr[], int tmp[], int l, int r) {
    if (l >= r) return;
    int m = l + (r - l) / 2;
    mergeSortSeq(arr, tmp, l, m);
    mergeSortSeq(arr, tmp, m + 1, r);
    merge(arr, tmp, l, m, r);
}

void mergeSortPar(int arr[], int tmp[], int l, int r) {
    if (l >= r) return;
    int m = l + (r - l) / 2;
    if (r - l < CUTOFF) {
        mergeSortSeq(arr, tmp, l, m);
        mergeSortSeq(arr, tmp, m + 1, r);
    } else {
        #pragma omp task shared(arr, tmp)
        mergeSortPar(arr, tmp, l, m);
        #pragma omp task shared(arr, tmp)
        mergeSortPar(arr, tmp, m + 1, r);
        #pragma omp taskwait
    }
    merge(arr, tmp, l, m, r);
}

void parallelMergeSort(int arr[], int tmp[], int n) {
    #pragma omp parallel
    {
        #pragma omp single
        mergeSortPar(arr, tmp, 0, n - 1);
    }
}

int isSorted(int arr[], int n) {
    for (int i = 1; i < n; i++)
        if (arr[i - 1] > arr[i]) return 0;
    return 1;
}

int main(void) {
    int sizes[] = {10000, 50000, 100000, 500000, 1000000, 2000000, 4000000};
    int count = sizeof(sizes) / sizeof(sizes[0]);
    double tseq[sizeof(sizes) / sizeof(sizes[0])];
    double tpar[sizeof(sizes) / sizeof(sizes[0])];

    srand((unsigned)time(NULL));

#ifdef _OPENMP
    printf("OpenMP enabled, max threads = %d\n", omp_get_max_threads());
#else
    printf("OpenMP NOT enabled (compile with -fopenmp). Running serially.\n");
#endif
    printf("\nExperiment 2: Parallel Merge Sort timing\n");
    printf("---------------------------------------------------------------\n");
    printf("%10s %16s %16s %10s %8s\n", "n", "Sequential(ms)", "Parallel(ms)", "Speedup", "Sorted");
    printf("---------------------------------------------------------------\n");

    for (int k = 0; k < count; k++) {
        int n = sizes[k];
        int *a = (int *)malloc(n * sizeof(int));
        int *b = (int *)malloc(n * sizeof(int));
        int *tmp = (int *)malloc(n * sizeof(int));
        if (!a || !b || !tmp) {
            printf("Memory allocation failed for n = %d\n", n);
            return 1;
        }
        for (int i = 0; i < n; i++)
            a[i] = b[i] = rand();

        double t0 = now();
        mergeSortSeq(a, tmp, 0, n - 1);
        double t1 = now();
        parallelMergeSort(b, tmp, n);
        double t2 = now();

        tseq[k] = (t1 - t0) * 1000.0;
        tpar[k] = (t2 - t1) * 1000.0;
        printf("%10d %16.3f %16.3f %10.2f %8s\n", n, tseq[k], tpar[k],
               tpar[k] > 0 ? tseq[k] / tpar[k] : 0.0,
               (isSorted(a, n) && isSorted(b, n)) ? "Yes" : "No");

        free(a);
        free(b);
        free(tmp);
    }

    FILE *fp = fopen("exp2_data.txt", "w");
    if (fp) {
        for (int k = 0; k < count; k++)
            fprintf(fp, "%d %.3f %.3f\n", sizes[k], tseq[k], tpar[k]);
        fclose(fp);
        printf("\nData saved to exp2_data.txt (columns: n, sequential ms, parallel ms)\n");
    }

    FILE *gp = fopen("exp2_plot.gp", "w");
    if (gp) {
        fprintf(gp, "set terminal png size 800,600\n");
        fprintf(gp, "set output 'exp2_graph.png'\n");
        fprintf(gp, "set title 'Merge Sort: Time vs n'\n");
        fprintf(gp, "set xlabel 'n (number of elements)'\n");
        fprintf(gp, "set ylabel 'Time (ms)'\n");
        fprintf(gp, "set grid\n");
        fprintf(gp, "plot 'exp2_data.txt' using 1:2 with linespoints title 'Sequential', ");
        fprintf(gp, "'exp2_data.txt' using 1:3 with linespoints title 'Parallel'\n");
        fclose(gp);
        if (system("gnuplot exp2_plot.gp") == 0)
            printf("Graph saved as exp2_graph.png\n");
        else
            printf("gnuplot not found. Plot exp2_data.txt in Excel/Python to get the graph.\n");
    }
    return 0;
}
