#include <stdio.h>
#include <stdlib.h>
#include <time.h>
int main()
{
    int n, i, j, temp;
    clock_t start, end;
    double cpu_time_used;
    printf("Enter the number of elements: ");
    scanf("%d", &n);
    int arr[n];
    // Generate random numbers
    srand(time(NULL));
    printf("\nGenerated Elements:\n");
    for(i = 0; i < n; i++)
    {
        arr[i] = rand() % 1000;
        printf("%d ", arr[i]);
    }
    // Start timing
    start = clock();

    // Bubble Sort
    for(i = 0; i < n - 1; i++)
    {
        for(j = 0; j < n - i - 1; j++)
        {
            if(arr[j] > arr[j + 1])
            {
                temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
    // End timing
    end = clock();
    cpu_time_used = ((double)(end - start)) / CLOCKS_PER_SEC;
    printf("\n\nSorted Elements:\n");
    for(i = 0; i < n; i++)
    {
        printf("%d ", arr[i]);
    }
    printf("\n\nTime Required = %f seconds\n", cpu_time_used);
    return 0;
}
