#include <stdio.h>
#include <stdlib.h>
#include <time.h>
// Function to sort array (needed before binary search)
void sortArray(int arr[], int n)
{
    int i, j, temp;
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
}
// Binary Search function
int binarySearch(int arr[], int n, int key)
{
    int low = 0, high = n - 1, mid;
    while(low <= high)
    {
        mid = low + (high - low) / 2;
        if(arr[mid] == key)
            return mid;
        else if(arr[mid] < key)
            low = mid + 1;
        else
            high = mid - 1;
    }
    return -1;
}
int main()
{
    int n, i, key, pos;
    clock_t start, end;
    double cpu_time_used;
    printf("Enter the number of elements: ");
    scanf("%d", &n);
    int arr[n];
    // Generate random numbers
    srand(time(NULL));
    for(i = 0; i < n; i++)
        arr[i] = rand() % 1000;

    // Sort the array first (Binary Search needs sorted data)
    sortArray(arr, n);

    printf("\nGenerated (Sorted) Elements:\n");
    for(i = 0; i < n; i++)
        printf("%d ", arr[i]);

    printf("\n\nEnter the element to search: ");
    scanf("%d", &key);

    // Start timing
    start = clock();

    pos = binarySearch(arr, n, key);

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
