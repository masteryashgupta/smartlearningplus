#include <stdio.h>
#include <stdlib.h>
#include <time.h>
int main()
{
    int n, i, key, pos = -1;
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
    printf("\n\nEnter the element to search: ");
    scanf("%d", &key);

    // Start timing
    start = clock();

    // Linear Search
    for(i = 0; i < n; i++)
    {
        if(arr[i] == key)
        {
            pos = i;
            break;
        }
    }

    // End timing
    end = clock();
    cpu_time_used = ((double)(end - start)) / CLOCKS_PER_SEC;

    if(pos != -1)
        printf("\nElement %d found at position %d\n", key, pos + 1);
    else
        printf("\nElement %d not found in the array\n", key);

    printf("\nTime Required = %f seconds\n", cpu_time_used);
    return 0;
}
