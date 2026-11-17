#include <stdio.h>
#include <stdlib.h>
#include <time.h>

void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int partition(int arr[], int low, int high) {

    int mid = low + (high - low) / 2;
    swap(&arr[mid], &arr[high]);
    int pivot = arr[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] <= pivot) {
            i++;
            swap(&arr[i], &arr[j]);
        }
    }
    swap(&arr[i + 1], &arr[high]);
    return i + 1;
}

void quickSort(int arr[], int low, int high) {
    while (low < high) {
        int p = partition(arr, low, high);

        if (p - low < high - p) {
            quickSort(arr, low, p - 1);
            low = p + 1;
        } else {
            quickSort(arr, p + 1, high);
            high = p - 1;
        }
    }
}

int isSorted(int arr[], int n) {
    for (int i = 1; i < n; i++)
        if (arr[i - 1] > arr[i]) return 0;
    return 1;
}

int main(void) {
    int sizes[] = {10000, 20000, 40000, 60000, 80000, 100000, 200000, 400000, 600000, 800000, 1000000};
    int count = sizeof(sizes) / sizeof(sizes[0]);
    double times[sizeof(sizes) / sizeof(sizes[0])];

    srand((unsigned)time(NULL));

    printf("Experiment 1: Quicksort timing\n");
    printf("-------------------------------------\n");
    printf("%12s %18s %8s\n", "n", "Time (ms)", "Sorted");
    printf("-------------------------------------\n");

    for (int k = 0; k < count; k++) {
        int n = sizes[k];
        int *arr = (int *)malloc(n * sizeof(int));
        if (arr == NULL) {
            printf("Memory allocation failed for n = %d\n", n);
            return 1;
        }
        for (int i = 0; i < n; i++)
            arr[i] = rand();

        clock_t start = clock();
        quickSort(arr, 0, n - 1);
        clock_t end = clock();

        times[k] = ((double)(end - start) / CLOCKS_PER_SEC) * 1000.0;
        printf("%12d %18.3f %8s\n", n, times[k], isSorted(arr, n) ? "Yes" : "No");
        free(arr);
    }

    FILE *fp = fopen("exp1_data.txt", "w");
    if (fp) {
        for (int k = 0; k < count; k++)
            fprintf(fp, "%d %.3f\n", sizes[k], times[k]);
        fclose(fp);
        printf("\nData saved to exp1_data.txt (columns: n, time in ms)\n");
    }

    FILE *gp = fopen("exp1_plot.gp", "w");
    if (gp) {
        fprintf(gp, "set terminal png size 800,600\n");
        fprintf(gp, "set output 'exp1_graph.png'\n");
        fprintf(gp, "set title 'Quicksort: Time vs n'\n");
        fprintf(gp, "set xlabel 'n (number of elements)'\n");
        fprintf(gp, "set ylabel 'Time (ms)'\n");
        fprintf(gp, "set grid\n");
        fprintf(gp, "plot 'exp1_data.txt' using 1:2 with linespoints title 'Quicksort'\n");
        fclose(gp);
        if (system("gnuplot exp1_plot.gp") == 0)
            printf("Graph saved as exp1_graph.png\n");
        else
            printf("gnuplot not found. Plot exp1_data.txt in Excel/Python to get the graph.\n");
    }
    return 0;
}
